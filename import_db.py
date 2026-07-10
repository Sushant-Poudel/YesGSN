#!/usr/bin/env python3
"""Import database from db_backup.json into MongoDB."""
import json
import os
from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
BACKUP_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db_backup.json")

def main():
    print(f"Connecting to MongoDB at {MONGO_URL}...")
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    print(f"Loading backup from {BACKUP_FILE}...")
    with open(BACKUP_FILE, "r") as f:
        data = json.load(f)

    for collection_name, documents in data.items():
        if not documents:
            print(f"  Skipping empty collection: {collection_name}")
            continue
        # Drop existing collection to avoid duplicates
        db[collection_name].drop()
        db[collection_name].insert_many(documents)
        print(f"  Imported {len(documents)} documents into '{collection_name}'")

    print(f"\nDatabase '{DB_NAME}' imported successfully!")
    client.close()

if __name__ == "__main__":
    main()
