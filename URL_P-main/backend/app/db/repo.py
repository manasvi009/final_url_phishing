# backend/app/db/repo.py

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import tldextract

from app.db.mongo import get_prediction_collection


def _normalize_url_for_domain(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if "://" not in url:
        url = "http://" + url
    return url


def _extract_domain(url: str) -> Tuple[str, str]:
    """
    Returns (base_domain, host)
      base_domain: example.com
      host: sub.example.com
    """
    norm = _normalize_url_for_domain(url)
    try:
        p = urlparse(norm)
        host = (p.netloc or "").split("@")[-1].split(":")[0].lower()
    except Exception:
        host = ""

    ext = tldextract.extract(host)
    base_domain = ""
    if ext.domain and ext.suffix:
        base_domain = f"{ext.domain}.{ext.suffix}".lower()
    else:
        base_domain = host.lower()

    return base_domain, host.lower()


def save_prediction(doc: Dict[str, Any]) -> str:
    """
    Saves a prediction record into MongoDB.
    Returns inserted_id as str.
    """
    col = get_prediction_collection()

    url = doc.get("url", "")
    domain, host = _extract_domain(url)

    record = {
        "url": url,
        "prediction": int(doc.get("prediction", 0)),
        "label": doc.get("label", "legitimate"),
        "risk_score": float(doc.get("risk_score", 0.0)),
        "threshold": float(doc.get("threshold", 0.5)),
        "features": doc.get("features", None),
        "explanation": doc.get("explanation", None),
        "domain": domain,
        "host": host,
        "user_id": doc.get("user_id", None),  # Store user ID if provided
        "user_email": doc.get("user_email", None),  # Store user email if provided
        "source": doc.get("source", None),  # optional if you later include dataset source
        "timestamp": doc.get("timestamp") or datetime.utcnow().isoformat() + "Z",
        "ts": datetime.utcnow(),  # native datetime for fast queries/aggregation
    }

    res = col.insert_one(record)
    return str(res.inserted_id)


def get_history(limit: int = 20, label: Optional[str] = None) -> List[Dict[str, Any]]:
    col = get_prediction_collection()
    limit = max(1, min(limit, 200))

    q: Dict[str, Any] = {}
    if label in {"phishing", "legitimate"}:
        q["label"] = label

    cursor = col.find(q, {"features": 0}).sort("ts", -1).limit(limit)
    out: List[Dict[str, Any]] = []
    for x in cursor:
        x["_id"] = str(x["_id"])
        # convert datetime to iso
        if isinstance(x.get("ts"), datetime):
            x["ts"] = x["ts"].isoformat() + "Z"
        out.append(x)
    return out


def stats_summary(days: int = 30) -> Dict[str, Any]:
    """
    Returns total scans and phishing rate in last N days.
    """
    col = get_prediction_collection()
    days = max(1, min(days, 365))
    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {
            "$group": {
                "_id": "$label",
                "count": {"$sum": 1},
                "avg_risk": {"$avg": "$risk_score"},
            }
        },
    ]

    rows = list(col.aggregate(pipeline))
    total = sum(r["count"] for r in rows) if rows else 0
    phishing = next((r for r in rows if r["_id"] == "phishing"), None)
    legit = next((r for r in rows if r["_id"] == "legitimate"), None)

    phishing_count = phishing["count"] if phishing else 0
    legit_count = legit["count"] if legit else 0
    phishing_rate = (phishing_count / total) if total else 0.0

    return {
        "window_days": days,
        "total_scans": total,
        "phishing_scans": phishing_count,
        "legitimate_scans": legit_count,
        "phishing_rate": round(phishing_rate, 4),
        "avg_risk_phishing": round(float(phishing["avg_risk"]), 4) if phishing else None,
        "avg_risk_legitimate": round(float(legit["avg_risk"]), 4) if legit else None,
    }


def stats_top_domains(days: int = 30, limit: int = 10, label: str = "phishing") -> List[Dict[str, Any]]:
    """
    Returns top domains by count in last N days (default: phishing).
    """
    col = get_prediction_collection()
    days = max(1, min(days, 365))
    limit = max(1, min(limit, 50))
    label = label if label in {"phishing", "legitimate"} else "phishing"
    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"ts": {"$gte": since}, "label": label, "domain": {"$ne": ""}}},
        {"$group": {"_id": "$domain", "count": {"$sum": 1}, "avg_risk": {"$avg": "$risk_score"}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "domain": "$_id", "count": 1, "avg_risk": {"$round": ["$avg_risk", 4]}}},
    ]

    return list(col.aggregate(pipeline))


def stats_timeline(days: int = 30) -> List[Dict[str, Any]]:
    """
    Daily timeline counts (phishing vs legitimate) in last N days.
    """
    col = get_prediction_collection()
    days = max(1, min(days, 365))
    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {
            "$group": {
                "_id": {
                    "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
                    "label": "$label",
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.day": 1}},
    ]

    rows = list(col.aggregate(pipeline))

    # reshape into [{"day": "YYYY-MM-DD", "phishing": n, "legitimate": n, "total": n}, ...]
    by_day: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        day = r["_id"]["day"]
        label = r["_id"]["label"]
        by_day.setdefault(day, {"day": day, "phishing": 0, "legitimate": 0, "total": 0})
        by_day[day][label] = r["count"]
        by_day[day]["total"] += r["count"]

    return [by_day[k] for k in sorted(by_day.keys())]
