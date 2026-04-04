from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
from argon2 import PasswordHasher
from jose import JWTError, jwt
from pymongo.errors import DuplicateKeyError
from app.db.mongo import get_collection, get_prediction_collection
from app.db.repo import _normalize_url_for_domain

# Initialize password hasher
ph = PasswordHasher()

# JWT configuration
SECRET_KEY = "your-secret-key-change-in-production"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    try:
        return ph.verify(hashed_password, plain_password)
    except:
        return False


def normalize_email(email: str) -> str:
    """Normalize email for consistent storage and lookups."""
    return (email or "").strip().lower()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    """Verify a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_user(email: str):
    """Retrieve a user from the database by email."""
    users_col = get_collection("users")
    user = users_col.find_one({"email": normalize_email(email)})
    return user


def create_user(email: str, username: str, password: str):
    """Create a new user in the database."""
    try:
        users_col = get_collection("users")
        
        email = normalize_email(email)
        username = (username or "").strip()

        # Check if user already exists by email
        if users_col.find_one({"email": email}):
            return {"ok": False, "reason": "email_exists"}

        # Check if username is already taken
        if users_col.find_one({"username": username}):
            return {"ok": False, "reason": "username_exists"}
        
        # Hash the password
        hashed_password = hash_password(password)
        
        # Create the user document
        user_doc = {
            "email": email,
            "username": username,
            "hashed_password": hashed_password,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "is_active": True,
            "role": "user",
        }
        
        # Insert the user
        result = users_col.insert_one(user_doc)
        print(f"User created successfully: {email} with ID: {result.inserted_id}")
        return {"ok": True, "id": str(result.inserted_id)}
    except DuplicateKeyError as e:
        # Handle race conditions where a duplicate is inserted between checks.
        details = getattr(e, "details", {}) or {}
        key_value = details.get("keyValue", {})
        if "email" in key_value:
            return {"ok": False, "reason": "email_exists"}
        if "username" in key_value:
            return {"ok": False, "reason": "username_exists"}
        return {"ok": False, "reason": "duplicate_key"}
    except Exception as e:
        print(f"Error creating user: {e}")
        raise


def update_last_login(email: str):
    """Update the last login time for a user."""
    users_col = get_collection("users")
    users_col.update_one(
        {"email": normalize_email(email)},
        {"$set": {"last_login": datetime.utcnow()}}
    )


def get_user_predictions(user_id: str, limit: int = 20):
    """Get predictions made by a specific user."""
    predictions_col = get_prediction_collection()
    # Filter predictions by user_id if available in the collection
    cursor = predictions_col.find({"user_id": user_id}).sort("ts", -1).limit(limit)
    out = []
    for x in cursor:
        x["_id"] = str(x["_id"])
        if isinstance(x.get("ts"), datetime):
            x["ts"] = x["ts"].isoformat() + "Z"
        out.append(x)
    return out


def create_admin_user():
    """Create a default admin user if it doesn't exist."""
    try:
        users_col = get_collection("users")
        
        # Check if admin user already exists
        admin_email = normalize_email("admin@cybershield.com")
        admin_password = "Admin123!"
        existing_user = users_col.find_one({"email": admin_email})
        if existing_user:
            updates = {
                "username": "admin",
                "is_active": True,
                "role": "super_admin",
            }

            stored_hash = existing_user.get("hashed_password")
            if not stored_hash or not verify_password(admin_password, stored_hash):
                updates["hashed_password"] = hash_password(admin_password)

            users_col.update_one({"_id": existing_user["_id"]}, {"$set": updates})
            print(f"Admin user already exists and was verified: {existing_user['email']}")
            return existing_user["_id"]
        
        # Create admin user
        hashed_password = hash_password(admin_password)
        user_doc = {
            "email": admin_email,
            "username": "admin",
            "hashed_password": hashed_password,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "is_active": True,
            "role": "super_admin"  # Bootstrap account with full control
        }
        
        result = users_col.insert_one(user_doc)
        print(f"Admin user created successfully: {admin_email} with ID: {result.inserted_id}")
        return result.inserted_id  # Return the inserted ID
    except Exception as e:
        print(f"Error creating admin user: {e}")
        return None
