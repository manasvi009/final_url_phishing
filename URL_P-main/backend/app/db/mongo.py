# backend/app/db/mongo.py

from __future__ import annotations
import os
from typing import Optional
from pymongo import MongoClient
from pymongo.collection import Collection

_client: MongoClient | None = None


def get_prediction_collection_name() -> str:
    return os.getenv("MONGODB_COLLECTION", "predictions")


def get_collection(collection_name: Optional[str] = None) -> Collection:
    """
    Returns a pymongo Collection using env vars:
      MONGODB_URI, MONGODB_DB, MONGODB_COLLECTION
    If collection_name is provided, returns that specific collection
    """
    global _client

    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB", "url_phishing")
    default_col_name = get_prediction_collection_name()
    col_name = collection_name or default_col_name

    if _client is None:
        _client = MongoClient(uri)

    db = _client[db_name]
    col = db[col_name]

    # Helpful indexes
    try:
        col.create_index("timestamp")
        col.create_index("label")
        col.create_index("domain")
        # Add indexes for user-related queries
        if col_name == "users":
            col.create_index("email", unique=True)
            col.create_index("username", unique=True)
        elif col_name in {"predictions", "scans"}:
            col.create_index("user_id")
            col.create_index("user_email")
    except Exception:
        pass

    return col


def get_prediction_collection() -> Collection:
    return get_collection(get_prediction_collection_name())
