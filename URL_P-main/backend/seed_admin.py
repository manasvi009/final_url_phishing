from __future__ import annotations

from datetime import datetime, timedelta
import random

from app.auth import hash_password, normalize_email
from app.db.mongo import get_collection


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def seed_users():
    users = get_collection("users")
    admin_email = normalize_email("admin@cybershield.com")
    users.update_one(
        {"email": admin_email},
        {
            "$set": {
                "username": "admin",
                "email": admin_email,
                "hashed_password": hash_password("Admin123!"),
                "role": "super_admin",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "last_login": None,
            }
        },
        upsert=True,
    )

    normals = [
        ("analyst1@cybershield.com", "analyst1", "analyst"),
        ("user1@cybershield.com", "user1", "user"),
        ("user2@cybershield.com", "user2", "user"),
    ]
    for email, username, role in normals:
        users.update_one(
            {"email": normalize_email(email)},
            {
                "$set": {
                    "email": normalize_email(email),
                    "username": username,
                    "hashed_password": hash_password("User123!"),
                    "role": role,
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                    "last_login": None,
                }
            },
            upsert=True,
        )


def seed_scans():
    scans = get_collection("scans")
    scans.delete_many({"source": "seed_admin"})
    domains = ["google.com", "github.com", "secure-bank-login.com", "paypal-security-check.net", "microsoft.com"]
    labels = ["legitimate", "phishing"]
    for i in range(10):
        label = random.choice(labels)
        risk = round(random.uniform(0.01, 0.35), 4) if label == "legitimate" else round(random.uniform(0.75, 0.99), 4)
        domain = random.choice(domains)
        url = f"https://{domain}/path/{i}?q=test"
        scans.insert_one(
            {
                "url": url,
                "domain": domain,
                "host": domain,
                "label": label,
                "prediction": 1 if label == "phishing" else 0,
                "risk_score": risk,
                "threshold": 0.5,
                "verdict": "normal",
                "features": {"url_length": len(url), "num_dots": domain.count('.')},
                "explanation": "Seed scan for admin dashboard testing.",
                "user_email": "analyst1@cybershield.com",
                "user_id": "seed-user",
                "source": "seed_admin",
                "timestamp": now_iso(),
                "ts": datetime.utcnow() - timedelta(days=random.randint(0, 15)),
            }
        )


def seed_rules():
    rules = get_collection("rules")
    rules.delete_many({"source": "seed_admin"})
    seed = [
        {"list": "blacklist", "pattern": "paypal-security-check.net", "type": "domain", "description": "Known phishing domain"},
        {"list": "blacklist", "pattern": "secure-bank-login.com", "type": "domain", "description": "Brand impersonation"},
        {"list": "whitelist", "pattern": "google.com", "type": "domain", "description": "Trusted domain"},
        {"list": "whitelist", "pattern": "github.com", "type": "domain", "description": "Trusted dev domain"},
        {"list": "blacklist", "pattern": "login-verify-update", "type": "url", "description": "Suspicious token"},
    ]
    for r in seed:
        r.update({"enabled": True, "created_at": now_iso(), "created_by": "seed", "source": "seed_admin"})
        rules.insert_one(r)


def seed_api_keys():
    keys = get_collection("api_keys")
    keys.delete_many({"source": "seed_admin"})
    for i in range(3):
        keys.insert_one(
            {
                "name": f"seed-key-{i+1}",
                "rate_limit": 1000 * (i + 1),
                "status": "active" if i < 2 else "revoked",
                "key_prefix": f"pk_seed_{i+1}",
                "key_hash": f"seedhash{i+1}",
                "created_at": now_iso(),
                "created_by": "seed",
                "source": "seed_admin",
            }
        )


def seed_models():
    models = get_collection("models")
    models.delete_many({"source": "seed_admin"})
    models.insert_one(
        {
            "name": "Seed Model",
            "version": "v5-seed",
            "filename": "phishing_model_v5.pkl",
            "is_active": True,
            "uploaded_at": now_iso(),
            "uploaded_by": "seed",
            "metrics": {"accuracy": 0.9621, "precision": 0.9512, "recall": 0.9475, "auc": 0.9722},
            "source": "seed_admin",
        }
    )


def seed_alerts_and_rules():
    alert_rules = get_collection("alert_rules")
    alerts = get_collection("alerts")
    alert_rules.delete_many({"source": "seed_admin"})
    alerts.delete_many({"source": "seed_admin"})

    r1 = alert_rules.insert_one(
        {
            "name": "High phishing rate",
            "condition_type": "phishing_rate",
            "condition_value": 30,
            "enabled": True,
            "created_at": now_iso(),
            "created_by": "seed",
            "source": "seed_admin",
        }
    )
    alert_rules.insert_one(
        {
            "name": "Risk score spike",
            "condition_type": "risk_score",
            "condition_value": 0.95,
            "enabled": True,
            "created_at": now_iso(),
            "created_by": "seed",
            "source": "seed_admin",
        }
    )

    alerts.insert_one(
        {
            "rule_id": str(r1.inserted_id),
            "rule_name": "High phishing rate",
            "message": "Phishing rate exceeded threshold in last hour",
            "scan_id": "seed-scan-1",
            "severity": "high",
            "acknowledged": False,
            "timestamp": now_iso(),
            "ts": datetime.utcnow(),
            "source": "seed_admin",
        }
    )


def seed_audit_logs():
    logs = get_collection("audit_logs")
    logs.delete_many({"source": "seed_admin"})
    actions = [
        "rule_created",
        "user_updated",
        "model_activated",
        "scan_verdict_updated",
        "api_key_created",
    ]
    for a in actions:
        logs.insert_one(
            {
                "actor_email": "admin@cybershield.com",
                "action": a,
                "payload": {"seed": True},
                "timestamp": now_iso(),
                "ts": datetime.utcnow(),
                "source": "seed_admin",
            }
        )


def main():
    print("Seeding admin data...")
    seed_users()
    seed_scans()
    seed_rules()
    seed_api_keys()
    seed_models()
    seed_alerts_and_rules()
    seed_audit_logs()
    print("Seed complete.")
    print("Admin login: admin@cybershield.com / Admin123!")


if __name__ == "__main__":
    main()
