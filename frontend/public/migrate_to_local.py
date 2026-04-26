#!/usr/bin/env python3
"""
TG Exchange - MongoDB Atlas to Local Migration Script
Migrates all collections from Atlas to Local MongoDB
"""

from pymongo import MongoClient
import sys

# Configuration
ATLAS_URL = "mongodb+srv://tgadmin:2026Bhaviya%40%23143@cluster0.bcj5slz.mongodb.net/tgexchange?retryWrites=true"
LOCAL_URL = "mongodb://127.0.0.1:27017"
DB_NAME = "tgexchange"

def migrate():
    print("="*60)
    print("TG Exchange - MongoDB Migration: Atlas → Local")
    print("="*60)
    
    # Connect to Atlas
    print("\n[1] Connecting to Atlas...")
    try:
        atlas_client = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=30000)
        atlas_db = atlas_client[DB_NAME]
        # Test connection
        atlas_client.admin.command('ping')
        print("    ✓ Atlas connected!")
    except Exception as e:
        print(f"    ✗ Atlas connection failed: {e}")
        return False
    
    # Connect to Local
    print("\n[2] Connecting to Local MongoDB...")
    try:
        local_client = MongoClient(LOCAL_URL)
        local_db = local_client[DB_NAME]
        local_client.admin.command('ping')
        print("    ✓ Local MongoDB connected!")
    except Exception as e:
        print(f"    ✗ Local connection failed: {e}")
        return False
    
    # Get all collections
    print("\n[3] Getting collections from Atlas...")
    collections = atlas_db.list_collection_names()
    print(f"    Found {len(collections)} collections: {collections}")
    
    # Migrate each collection
    print("\n[4] Migrating collections...")
    total_docs = 0
    
    for coll_name in collections:
        try:
            # Get documents from Atlas
            docs = list(atlas_db[coll_name].find({}))
            count = len(docs)
            
            if count > 0:
                # Clear local collection first
                local_db[coll_name].delete_many({})
                # Insert to local
                local_db[coll_name].insert_many(docs)
            
            total_docs += count
            print(f"    ✓ {coll_name}: {count} documents")
            
        except Exception as e:
            print(f"    ✗ {coll_name}: Error - {e}")
    
    print(f"\n[5] Migration Complete!")
    print(f"    Total documents migrated: {total_docs}")
    print("="*60)
    
    # Verify
    print("\n[6] Verification...")
    local_users = local_db.users.count_documents({})
    atlas_users = atlas_db.users.count_documents({})
    print(f"    Atlas users: {atlas_users}")
    print(f"    Local users: {local_users}")
    
    if local_users == atlas_users:
        print("    ✓ Migration verified successfully!")
        return True
    else:
        print("    ✗ Mismatch! Check manually.")
        return False

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
