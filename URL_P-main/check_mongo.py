#!/usr/bin/env python3
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

print("=== MongoDB Database Information ===")
mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
mongodb_db = os.getenv('MONGODB_DB', 'url_phishing')

print(f"MONGODB_URI: {mongodb_uri}")
print(f"MONGODB_DB: {mongodb_db}")

# Connect to MongoDB
client = MongoClient(mongodb_uri)
print(f"Available databases: {client.list_database_names()}")

# Check url_phishing database
db = client[mongodb_db]
print(f"Collections in {db.name}: {db.list_collection_names()}")

# Check users collection
users_col = db['users']
user_count = users_col.count_documents({})
print(f"\n=== Users Collection ===")
print(f"Total users: {user_count}")

print("\nUser details:")
for user in users_col.find():
    print(f"ID: {user.get('_id')}")
    print(f"Email: {user.get('email')}")
    print(f"Username: {user.get('username')}")
    print(f"Created at: {user.get('created_at')}")
    print(f"Last login: {user.get('last_login')}")
    print(f"Active: {user.get('is_active')}")
    print("-" * 40)

# Check predictions collection
predictions_col = db['predictions']
prediction_count = predictions_col.count_documents({})
print(f"\n=== Predictions Collection ===")
print(f"Total predictions: {prediction_count}")

if prediction_count > 0:
    print("\nRecent predictions:")
    for pred in predictions_col.find().sort('timestamp', -1).limit(5):
        print(f"URL: {pred.get('url')}")
        print(f"Label: {pred.get('label')}")
        print(f"Risk Score: {pred.get('risk_score')}")
        print(f"Timestamp: {pred.get('timestamp')}")
        print("-" * 40)