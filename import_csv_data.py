#!/usr/bin/env python3
"""Import Customer_Details.csv and Order_Log.csv into MongoDB.

The CSVs are the standard admin-panel exports:

    Customer_Details.csv:
        Phone,Name,Email,Total Orders,Total Spent,Store Credits,Created At
    Order_Log.csv:
        Order ID,Customer,Item Name,Total,Status,Payment

Both files are mapped to the collection shapes the backend already reads:

- ``customers``: upserted by email (or phone if email is missing), so
  running this twice is safe.
- ``orders``:    upserted by ``id`` (the short Order ID from the CSV), so
  running this twice is safe.

Usage
-----
    MONGO_URL='mongodb+srv://...' DB_NAME=gameshopnepal \\
        python3 import_csv_data.py \\
            --customers-csv path/to/Customer_Details.csv \\
            --orders-csv    path/to/Order_Log.csv

Add ``--dry-run`` to preview counts and a couple of converted rows without
touching the database.
"""
import argparse
import csv
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from typing import Iterable, Optional

from pymongo import MongoClient, UpdateOne

RS_RE = re.compile(r"[^\d.\-]")  # strip anything that isn't a digit / . / -


def parse_price(raw: str) -> float:
    """'Rs 2,196.00' -> 2196.0.  Empty / N/A -> 0.0."""
    if raw is None:
        return 0.0
    s = str(raw).strip()
    if not s or s.upper() in ("N/A", "NA", "-"):
        return 0.0
    cleaned = RS_RE.sub("", s)
    if not cleaned or cleaned in (".", "-"):
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_int(raw: str) -> int:
    try:
        return int(float(str(raw).strip() or 0))
    except ValueError:
        return 0


def parse_created_at(raw: str) -> str:
    """CSV uses M/D/YYYY. Return ISO 8601 UTC (matches existing docs)."""
    if not raw:
        return datetime.now(timezone.utc).isoformat()
    s = str(raw).strip()
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            continue
    return datetime.now(timezone.utc).isoformat()


def clean(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s.lower() in ("pending", "n/a", "na", "-"):
        return None
    return s


# --------------------------------------------------------------------------- #
# Customers                                                                    #
# --------------------------------------------------------------------------- #
def rows_from_customers_csv(path: str) -> Iterable[dict]:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            phone_raw = (row.get("Phone") or "").strip()
            phone = phone_raw if phone_raw and phone_raw.lower() != "pending" else None
            email = clean(row.get("Email"))
            name = clean(row.get("Name"))
            if not (phone or email):
                continue  # nothing to key on

            yield {
                "id": str(uuid.uuid4()),
                "phone": phone,
                "name": name,
                "email": email,
                "total_orders": parse_int(row.get("Total Orders")),
                "total_spent": parse_price(row.get("Total Spent")),
                "store_credits": parse_price(row.get("Store Credits")),
                "created_at": parse_created_at(row.get("Created At")),
                "source": "csv_import",
            }


def upsert_customers(db, docs, dry_run=False) -> tuple[int, int]:
    ops, seen = [], set()
    for d in docs:
        key = d["email"] or d["phone"]
        if key in seen:
            continue
        seen.add(key)
        if d["email"]:
            filt = {"email": d["email"]}
        else:
            filt = {"phone": d["phone"], "email": None}
        # setOnInsert prevents overwriting the id / created_at on re-runs.
        ops.append(
            UpdateOne(
                filt,
                {
                    "$set": {
                        "phone": d["phone"],
                        "name": d["name"],
                        "email": d["email"],
                        "total_orders": d["total_orders"],
                        "total_spent": d["total_spent"],
                        "store_credits": d["store_credits"],
                        "source": d["source"],
                    },
                    "$setOnInsert": {
                        "id": d["id"],
                        "created_at": d["created_at"],
                    },
                },
                upsert=True,
            )
        )
    if dry_run or not ops:
        return len(ops), 0
    res = db["customers"].bulk_write(ops, ordered=False)
    return len(ops), (res.upserted_count or 0) + (res.modified_count or 0)


# --------------------------------------------------------------------------- #
# Orders                                                                       #
# --------------------------------------------------------------------------- #
def rows_from_orders_csv(path: str) -> Iterable[dict]:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            order_id = clean(row.get("Order ID"))
            if not order_id:
                continue
            customer_name = clean(row.get("Customer")) or "Unknown"
            item_name = clean(row.get("Item Name")) or "Unknown item"
            total = parse_price(row.get("Total"))
            status = (clean(row.get("Status")) or "pending").lower()
            payment = clean(row.get("Payment")) or None

            yield {
                "id": order_id,
                "customer_name": customer_name,
                "customer_phone": None,
                "customer_email": None,
                "items": [
                    {
                        "name": item_name,
                        "price": total,
                        "quantity": 1,
                        "variation": None,
                    }
                ],
                "total_amount": total,
                "status": status,
                "payment_method": payment,
                "source": "csv_import",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }


def upsert_orders(db, docs, dry_run=False) -> tuple[int, int]:
    ops, seen = [], set()
    for d in docs:
        if d["id"] in seen:
            continue
        seen.add(d["id"])
        ops.append(
            UpdateOne(
                {"id": d["id"]},
                {
                    "$set": {
                        "customer_name": d["customer_name"],
                        "items": d["items"],
                        "total_amount": d["total_amount"],
                        "status": d["status"],
                        "payment_method": d["payment_method"],
                        "source": d["source"],
                    },
                    "$setOnInsert": {
                        "id": d["id"],
                        "customer_phone": d["customer_phone"],
                        "customer_email": d["customer_email"],
                        "created_at": d["created_at"],
                    },
                },
                upsert=True,
            )
        )
    if dry_run or not ops:
        return len(ops), 0
    res = db["orders"].bulk_write(ops, ordered=False)
    return len(ops), (res.upserted_count or 0) + (res.modified_count or 0)


# --------------------------------------------------------------------------- #
# CLI                                                                          #
# --------------------------------------------------------------------------- #
def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--customers-csv", help="Path to Customer_Details.csv")
    p.add_argument("--orders-csv", help="Path to Order_Log.csv")
    p.add_argument("--dry-run", action="store_true", help="Parse and preview, do not write.")
    args = p.parse_args()

    if not (args.customers_csv or args.orders_csv):
        p.error("Provide at least one of --customers-csv or --orders-csv")

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")

    client = None
    db = None
    if not args.dry_run:
        if not mongo_url or not db_name:
            print("ERROR: MONGO_URL and DB_NAME env vars are required (or add --dry-run).", file=sys.stderr)
            return 2
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
        try:
            client.admin.command("ping")
        except Exception as e:
            print(f"ERROR: cannot reach MongoDB: {e}", file=sys.stderr)
            return 1
        db = client[db_name]

    if args.customers_csv:
        print(f"\n== Customers <- {args.customers_csv} ==")
        docs = list(rows_from_customers_csv(args.customers_csv))
        print(f"  parsed rows: {len(docs)}")
        for d in docs[:3]:
            print(f"  sample: {d}")
        prepared, written = upsert_customers(db, docs, dry_run=args.dry_run)
        if args.dry_run:
            print(f"  [dry-run] would prepare {prepared} upserts")
        else:
            print(f"  upserts prepared: {prepared}   docs affected: {written}")

    if args.orders_csv:
        print(f"\n== Orders <- {args.orders_csv} ==")
        docs = list(rows_from_orders_csv(args.orders_csv))
        print(f"  parsed rows: {len(docs)}")
        for d in docs[:3]:
            print(f"  sample: {d}")
        prepared, written = upsert_orders(db, docs, dry_run=args.dry_run)
        if args.dry_run:
            print(f"  [dry-run] would prepare {prepared} upserts")
        else:
            print(f"  upserts prepared: {prepared}   docs affected: {written}")

    if client:
        client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
