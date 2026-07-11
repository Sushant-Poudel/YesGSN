#!/usr/bin/env python3
"""Import ``db_backup.json`` into a MongoDB deployment.

Works with a local Mongo (``mongodb://localhost:27017``) and with a
DigitalOcean Managed MongoDB SRV URI (``mongodb+srv://.../db?tls=true&...``).

Usage examples
--------------
    # Wipe & reload every collection (dev)
    MONGO_URL=mongodb://localhost:27017 DB_NAME=gameshopnepal \\
        python import_db.py

    # Production: only customers + orders, MERGE by _id (do NOT drop)
    MONGO_URL="mongodb+srv://..." DB_NAME=gameshopnepal \\
        python import_db.py --mode upsert \\
        --collections customers orders takeapp_orders order_status_history

    # Dry run (parse + count only, no writes)
    python import_db.py --dry-run
"""
import argparse
import json
import os
import sys
from pathlib import Path

from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

DEFAULT_BACKUP = Path(__file__).resolve().parent / "db_backup.json"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--backup", default=str(DEFAULT_BACKUP), help="Path to db_backup.json")
    p.add_argument(
        "--mode",
        choices=("replace", "upsert", "insert"),
        default="replace",
        help=(
            "replace: drop the collection then insert all docs (destructive; default). "
            "upsert:  keep existing docs, update-or-insert by _id (safe for production). "
            "insert:  insert new docs only, skip duplicates."
        ),
    )
    p.add_argument(
        "--collections",
        nargs="*",
        default=None,
        help="Only import these collections (default: all in the backup).",
    )
    p.add_argument("--dry-run", action="store_true", help="Parse and count, do not write.")
    return p.parse_args()


def load_backup(path: str) -> dict:
    print(f"Loading backup from {path} ...")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"  Found {len(data)} collections in backup.")
    return data


def import_replace(collection, documents) -> int:
    collection.drop()
    if documents:
        collection.insert_many(documents, ordered=False)
    return len(documents)


def import_upsert(collection, documents) -> int:
    ops = []
    skipped = 0
    for doc in documents:
        if "_id" not in doc:
            skipped += 1
            continue
        ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": doc}, upsert=True))
    if not ops:
        return 0
    result = collection.bulk_write(ops, ordered=False)
    written = (result.upserted_count or 0) + (result.modified_count or 0)
    if skipped:
        print(f"    (skipped {skipped} docs with no _id)")
    return written


def import_insert(collection, documents) -> int:
    if not documents:
        return 0
    try:
        result = collection.insert_many(documents, ordered=False)
        return len(result.inserted_ids)
    except BulkWriteError as e:
        # Duplicate _id is fine in insert mode — count what actually landed.
        details = e.details or {}
        inserted = details.get("nInserted", 0)
        dupes = sum(1 for err in details.get("writeErrors", []) if err.get("code") == 11000)
        other = len(details.get("writeErrors", [])) - dupes
        if other:
            raise
        print(f"    (inserted {inserted}, {dupes} duplicates ignored)")
        return inserted


def main() -> int:
    args = parse_args()

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("ERROR: MONGO_URL and DB_NAME environment variables are required.", file=sys.stderr)
        return 2

    # Hide credentials in the log line
    safe_url = mongo_url
    if "@" in safe_url:
        scheme, rest = safe_url.split("://", 1)
        _, host = rest.split("@", 1)
        safe_url = f"{scheme}://***@{host}"
    print(f"Connecting to MongoDB at {safe_url} (db={db_name}, mode={args.mode}) ...")

    data = load_backup(args.backup)

    wanted = set(args.collections) if args.collections else None
    if wanted:
        missing = wanted - set(data.keys())
        if missing:
            print(f"WARNING: collections not in backup, skipping: {sorted(missing)}", file=sys.stderr)

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"ERROR: cannot reach MongoDB: {e}", file=sys.stderr)
        return 1
    db = client[db_name]

    total = 0
    for name, docs in data.items():
        if wanted and name not in wanted:
            continue
        docs = docs or []
        if args.dry_run:
            print(f"  [dry-run] {name}: {len(docs)} docs")
            total += len(docs)
            continue

        if not docs:
            print(f"  Skipping empty collection: {name}")
            continue

        if args.mode == "replace":
            n = import_replace(db[name], docs)
        elif args.mode == "upsert":
            n = import_upsert(db[name], docs)
        else:
            n = import_insert(db[name], docs)
        print(f"  {name}: {n} documents ({args.mode})")
        total += n

    print(f"\nDone. {total} documents processed into '{db_name}'.")
    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
