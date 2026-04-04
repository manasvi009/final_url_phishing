# backend/app/main.py

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.model_service import predict_url  # noqa: E402
from app.db.repo import (  # noqa: E402
    save_prediction,
    get_history,
    stats_summary,
    stats_top_domains,
    stats_timeline,
)
from app.auth import (  # noqa: E402
    create_user,
    get_user,
    verify_password,
    create_access_token,
    verify_token,
    update_last_login,
    get_user_predictions,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_admin_user,
    normalize_email,
)
from app.admin_routes import (  # noqa: E402
    router as admin_router,
    init_admin_defaults,
    apply_pre_scan_rules,
    log_llm_usage,
    evaluate_alerts_for_scan,
)

try:
    from app.llm_service import generate_explanation  # type: ignore  # noqa: E402
    LLM_AVAILABLE = True
except Exception:
    LLM_AVAILABLE = False


app = FastAPI(
    title="URL Phishing Detection API",
    version="1.1.0",
    description="Predict phishing URLs using ML + optional LLM explanations + MongoDB history + analytics.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(admin_router)


class PredictRequest(BaseModel):
    url: str = Field(..., examples=["https://example.com/login?verify=true"])
    include_features: bool = True
    include_llm_explanation: bool = True
    threshold: float = Field(0.5, ge=0.0, le=1.0)


class Token(BaseModel):
    access_token: str
    token_type: str
    role: Optional[str] = None


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: str
    username: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: str


class UserSettingsPatch(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    notifications_email: Optional[bool] = None
    notifications_push: Optional[bool] = None
    notifications_security: Optional[bool] = None
    privacy_data_sharing: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class PredictRequest(BaseModel):
    url: str = Field(..., examples=["https://example.com/login?verify=true"])
    include_features: bool = True
    include_llm_explanation: bool = True
    threshold: float = Field(0.5, ge=0.0, le=1.0)


class PredictResponse(BaseModel):
    url: str
    prediction: int
    label: str
    risk_score: float
    threshold: float
    explanation: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    timestamp: str
    saved_id: Optional[str] = None


security = HTTPBearer(auto_error=False)


def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        return None

    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        return None  # Return None for unauthenticated requests
    email: str = payload.get("sub")
    if email is None:
        return None
    user = get_user(email=email)
    if user is None:
        return None
    return user


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user = get_user(email=email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.post("/register", response_model=UserResponse)
def register(user: UserCreate):
    try:
        print(f"Registration attempt for email: {user.email}")
        create_result = create_user(user.email, user.username, user.password)
        if not create_result.get("ok"):
            reason = create_result.get("reason")
            if reason == "email_exists":
                raise HTTPException(status_code=400, detail="Email already registered")
            if reason == "username_exists":
                raise HTTPException(status_code=400, detail="Username already taken")
            raise HTTPException(status_code=400, detail="User already exists")
        user_id = create_result["id"]
        
        # Return the created user
        response = UserResponse(
            id=user_id,
            email=user.email,
            username=user.username,
            created_at=datetime.utcnow().isoformat() + "Z"
        )
        print(f"Registration successful for: {user.email}")
        return response
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/login", response_model=Token)
def login(user: UserLogin):
    email = normalize_email(user.email)
    db_user = get_user(email=email)
    if not db_user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    stored_hash = db_user.get("hashed_password")
    password_ok = False
    if stored_hash:
        password_ok = verify_password(user.password, stored_hash)
    elif db_user.get("password"):
        # Backward compatibility for legacy records with plain-text password.
        password_ok = user.password == db_user.get("password")

    if not password_ok:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not db_user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Update last login time
    update_last_login(email)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    role = (db_user.get("role") or "user").strip().lower()
    if role == "viewer":
        role = "analyst"
    access_token = create_access_token(
        data={"sub": email, "role": role}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": role}


@app.on_event("startup")
async def startup_event():
    """Create admin user on startup."""
    create_admin_user()
    init_admin_defaults()


@app.get("/")
def home():
    return {
        "message": "URL Phishing Detection API is running✅",
        "docs": "/docs",
        "endpoints": ["/health", "/predict", "/history", "/stats/summary", "/stats/top-domains", "/stats/timeline", "/register", "/login"],
        "llm_available": LLM_AVAILABLE,
    }


@app.get("/health")
def health():
    return {"status": "ok", "llm_available": LLM_AVAILABLE}


@app.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    role = (current_user.get("role") or "user").strip().lower()
    if role == "viewer":
        role = "analyst"
    return {
        "id": str(current_user.get("_id")),
        "email": current_user.get("email"),
        "username": current_user.get("username"),
        "role": role,
        "is_active": current_user.get("is_active", True),
    }


@app.get("/user/settings")
def get_user_settings(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user.get("username", ""),
        "email": current_user.get("email", ""),
        "bio": current_user.get("bio", ""),
        "notifications": {
            "email": current_user.get("notifications", {}).get("email", True),
            "push": current_user.get("notifications", {}).get("push", False),
            "security": current_user.get("notifications", {}).get("security", True),
        },
        "privacy": {
            "data_sharing": current_user.get("privacy", {}).get("data_sharing", "none"),
        },
        "security": {
            "two_factor_enabled": current_user.get("security", {}).get("two_factor_enabled", False),
        },
        "updated_at": current_user.get("settings_updated_at"),
    }


@app.patch("/user/settings")
def update_user_settings(payload: UserSettingsPatch, current_user: dict = Depends(get_current_user)):
    from app.db.mongo import get_collection

    updates = payload.model_dump(exclude_none=True)
    set_doc: Dict[str, Any] = {"settings_updated_at": datetime.utcnow().isoformat() + "Z"}

    if "username" in updates:
        username = (updates["username"] or "").strip()
        if not username:
            raise HTTPException(status_code=400, detail="Username cannot be empty")
        set_doc["username"] = username

    if "bio" in updates:
        set_doc["bio"] = (updates["bio"] or "").strip()[:500]

    if any(k in updates for k in ["notifications_email", "notifications_push", "notifications_security"]):
        set_doc["notifications.email"] = bool(updates.get("notifications_email", current_user.get("notifications", {}).get("email", True)))
        set_doc["notifications.push"] = bool(updates.get("notifications_push", current_user.get("notifications", {}).get("push", False)))
        set_doc["notifications.security"] = bool(updates.get("notifications_security", current_user.get("notifications", {}).get("security", True)))

    if "privacy_data_sharing" in updates:
        allowed = {"none", "trusted", "all"}
        val = (updates["privacy_data_sharing"] or "").strip().lower()
        if val not in allowed:
            raise HTTPException(status_code=400, detail="Invalid privacy data sharing value")
        set_doc["privacy.data_sharing"] = val

    users_col = get_collection("users")
    res = users_col.update_one({"_id": current_user["_id"]}, {"$set": set_doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user = users_col.find_one({"_id": current_user["_id"]})
    return {
        "status": "ok",
        "username": user.get("username", ""),
        "bio": user.get("bio", ""),
        "notifications": user.get("notifications", {"email": True, "push": False, "security": True}),
        "privacy": user.get("privacy", {"data_sharing": "none"}),
        "updated_at": user.get("settings_updated_at"),
    }


@app.post("/user/change-password")
def change_password(payload: PasswordChange, current_user: dict = Depends(get_current_user)):
    from app.db.mongo import get_collection
    from app.auth import hash_password

    if len(payload.new_password or "") < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    stored_hash = current_user.get("hashed_password")
    if not stored_hash or not verify_password(payload.current_password, stored_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    users_col = get_collection("users")
    users_col.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "hashed_password": hash_password(payload.new_password),
                "password_changed_at": datetime.utcnow().isoformat() + "Z",
            }
        },
    )
    return {"status": "ok", "message": "Password updated successfully"}


@app.get("/check-admin")
def check_admin():
    """Check if admin user exists."""
    try:
        from app.db.mongo import get_collection
        users_col = get_collection("users")
        admin_user = users_col.find_one({"email": "admin@cybershield.com"})
        
        if admin_user:
            admin_user["_id"] = str(admin_user["_id"])
            if isinstance(admin_user.get("created_at"), datetime):
                admin_user["created_at"] = admin_user["created_at"].isoformat()
            if isinstance(admin_user.get("last_login"), datetime):
                admin_user["last_login"] = admin_user["last_login"].isoformat() if admin_user["last_login"] else None
            return {"exists": True, "user": admin_user}
        else:
            return {"exists": False, "message": "Admin user not found"}
    except Exception as e:
        return {"exists": False, "error": str(e)}


@app.post("/create-admin")
def create_admin_user_endpoint():
    """Manually create admin user."""
    try:
        from app.auth import create_admin_user
        create_admin_user()
        return {"status": "success", "message": "Admin user created"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/list-users")
def list_users():
    """List all users in the database."""
    try:
        from app.db.mongo import get_collection
        users_col = get_collection("users")
        users = list(users_col.find({}, {"hashed_password": 0}))  # Exclude passwords
        
        # Convert ObjectId to string for JSON serialization
        for user in users:
            user["_id"] = str(user["_id"])
            if isinstance(user.get("created_at"), datetime):
                user["created_at"] = user["created_at"].isoformat()
            if isinstance(user.get("last_login"), datetime):
                user["last_login"] = user["last_login"].isoformat() if user["last_login"] else None
        
        return {
            "status": "success",
            "users": users,
            "count": len(users)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/test-db")
def test_db():
    """Test database connection and user operations."""
    try:
        from app.db.mongo import get_collection
        users_col = get_collection("users")
        user_count = users_col.count_documents({})
        sample_user = users_col.find_one()
        
        return {
            "status": "Database connection successful",
            "user_count": user_count,
            "sample_user": str(sample_user) if sample_user else None,
            "collections": [col for col in users_col.database.list_collection_names()]
        }
    except Exception as e:
        return {"status": "Database error", "error": str(e)}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, request: Request):
    url = (req.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Public endpoint: optionally associate scan with user if a valid bearer token is present.
    current_user = None
    auth_header = request.headers.get("authorization") or ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            payload = verify_token(token)
            email = payload.get("sub") if payload else None
            if email:
                user = get_user(email=email)
                if user:
                    current_user = user

    rule_result = apply_pre_scan_rules(url)
    try:
        result = rule_result if rule_result else predict_url(url, threshold=req.threshold)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    explanation = None
    if req.include_llm_explanation and LLM_AVAILABLE:
        try:
            explanation = generate_explanation(
                url=url,
                label=result["label"],
                risk_score=result["risk_score"],
                features=result["features"],
            )
            log_llm_usage(url=url, label=result["label"], risk_score=result["risk_score"], success=True)
        except Exception:
            explanation = None
            log_llm_usage(url=url, label=result["label"], risk_score=result["risk_score"], success=False, error="generation_failed")

    payload = {
        "url": url,
        "prediction": result["prediction"],
        "label": result["label"],
        "risk_score": result["risk_score"],
        "threshold": req.threshold,
        "explanation": explanation,
        "features": result["features"] if req.include_features else None,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    # Add user ID to the payload if authenticated
    if current_user:
        payload["user_id"] = str(current_user["_id"])
        payload["user_email"] = current_user["email"]
    else:
        # For unauthenticated requests, use a temporary identifier
        payload["user_id"] = "anonymous"
        payload["user_email"] = "anonymous"

    # Save in MongoDB
    try:
        saved_id = save_prediction(payload)
    except Exception as e:
        # If DB fails, still return prediction (don't break API)
        saved_id = None

    payload["saved_id"] = saved_id
    if saved_id:
        try:
            from bson import ObjectId
            from app.db.mongo import get_prediction_collection
            saved_doc = get_prediction_collection().find_one({"_id": ObjectId(saved_id)})
            if saved_doc:
                evaluate_alerts_for_scan(saved_doc)
        except Exception:
            pass
    return payload


@app.get("/user/history")
def user_history(limit: int = 20, current_user: dict = Depends(get_current_user)):
    """
    Fetch last N predictions for the authenticated user.
    """
    try:
        return get_user_predictions(str(current_user["_id"]), limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User history fetch failed: {e}")


@app.get("/history")
def history(limit: int = 20, label: Optional[str] = None):
    """
    Fetch last N predictions from MongoDB.
    label: phishing | legitimate | None
    """
    try:
        return get_history(limit=limit, label=label)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History fetch failed: {e}")


@app.get("/stats/summary")
def stats_summary_api(days: int = 30):
    """
    Summary stats for last N days.
    """
    try:
        return stats_summary(days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats summary failed: {e}")


@app.get("/stats/top-domains")
def stats_top_domains_api(days: int = 30, limit: int = 10, label: str = "phishing"):
    """
    Top domains by count (phishing by default).
    """
    try:
        return stats_top_domains(days=days, limit=limit, label=label)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Top domains failed: {e}")


@app.get("/stats/timeline")
def stats_timeline_api(days: int = 30):
    """
    Daily counts timeline for last N days.
    """
    try:
        return stats_timeline(days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timeline failed: {e}")
