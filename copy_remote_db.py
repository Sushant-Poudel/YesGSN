#!/usr/bin/env python3
"""Copy all data from remote MongoDB Atlas to local MongoDB."""
from pymongo import MongoClient
import ssl

REMOTE_URI = "mongodb+srv://darkdigital:d5t23t4lqs2c739ipg3g@customer-apps.zuexhq.mongodb.net/?appName=dark-commerce-dev&retryWrites=true&w=majority"
REMOTE_DB = "dark-commerce-dev"

LOCAL_URI = "mongodb://localhost:27017"
LOCAL_DB = "test_database"

def main():
    print("Connecting to remote MongoDB Atlas...")
    remote_client = MongoClient(
        REMOTE_URI,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000,
        tls=True,
        tlsAllowInvalidCertificates=True,
    )
    remote_db = remote_client[REMOTE_DB]
    
    # Test connection
    collections = remote_db.list_collection_names()
    print(f"Found {len(collections)} collections: {sorted(collections)}\n")

    print("Connecting to local MongoDB...")
    local_client = MongoClient(LOCAL_URI)
    local_db = local_client[LOCAL_DB]

    total_docs = 0
    for coll_name in sorted(collections):
        docs = list(remote_db[coll_name].find())
        count = len(docs)
        if count == 0:
            print(f"  {coll_name}: empty, skipping")
            continue
        local_db[coll_name].drop()
        local_db[coll_name].insert_many(docs)
        print(f"  {coll_name}: {count} docs copied")
        total_docs += count

    print(f"\nDone! Copied {total_docs} total documents across {len(collections)} collections into '{LOCAL_DB}'")
    remote_client.close()
    local_client.close()

if __name__ == "__main__":
    main()
