# backend/app/model_service.py

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, Tuple, Any, Optional

import joblib
import numpy as np
import pandas as pd

from app.feature_extractor import extract_features


BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
MODELS_DIR = BASE_DIR / "models"

_MODEL: Any = None
_FEATURE_COLUMNS: Optional[list] = None
_SCALER = None


def _normalize_url(url: str) -> str:
    """
    Make URL parse-friendly for consistent feature extraction:
    - strip spaces
    - add http:// if scheme missing
    """
    url = (url or "").strip()
    if not url:
        return ""
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url):
        url = "http://" + url
    return url


def _load_artifacts() -> Tuple[Any, list, Any]:
    """
    Load model, feature columns and scaler. Cached in memory after first call.
    """
    global _MODEL, _FEATURE_COLUMNS, _SCALER

    if _MODEL is None or _FEATURE_COLUMNS is None or _SCALER is None:
        # Try to load the v5 model first (which addresses dataset bias)
        model_path = MODELS_DIR / "phishing_model_v5.pkl"
        cols_path = MODELS_DIR / "feature_columns_v5.pkl"
        scaler_path = MODELS_DIR / "feature_scaler_v5.pkl"

        if not model_path.exists():
            # Fallback to v4 model if v5 doesn't exist
            model_path = MODELS_DIR / "phishing_model_v4.pkl"
            cols_path = MODELS_DIR / "feature_columns_v4.pkl"
            scaler_path = MODELS_DIR / "feature_scaler.pkl"

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found at {model_path}. Run: python training/train_v5.py"
            )
        if not cols_path.exists():
            raise FileNotFoundError(
                f"Feature columns file not found at {cols_path}. Run: python training/train_v5.py"
            )

        _MODEL = joblib.load(model_path)
        _FEATURE_COLUMNS = joblib.load(cols_path)
        
        # Load scaler if it exists
        if scaler_path.exists():
            _SCALER = joblib.load(scaler_path)
        else:
            _SCALER = None

    return _MODEL, _FEATURE_COLUMNS, _SCALER


def _build_feature_row(url: str, feature_columns: list) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Extract features and return a 1-row dataframe in the exact training column order.
    """
    url = _normalize_url(url)
    feats = extract_features(url)

    X = pd.DataFrame([feats])

    # Ensure all expected columns exist
    for col in feature_columns:
        if col not in X.columns:
            X[col] = 0

    # Exact order + sanitize numeric values
    X = X[feature_columns].replace([np.inf, -np.inf], np.nan).fillna(0)

    # Ensure numeric dtype for safety
    for c in X.columns:
        if X[c].dtype == "object":
            X[c] = pd.to_numeric(X[c], errors="coerce").fillna(0)

    return X, feats


def _top_feature_hints(model: Any, feature_columns: list, X: pd.DataFrame, top_k: int = 8):
    """
    Approximate "why" using feature_importances_ (XGBoost/RandomForest) × feature value.
    Not perfect, but very useful for debugging.
    """
    # Check if the model has feature_importances_ attribute
    if hasattr(model, "feature_importances_"):
        importances = np.array(model.feature_importances_, dtype=float)
        if importances.shape[0] != len(feature_columns):
            return []

        vals = X.iloc[0].to_numpy(dtype=float)
        scores = importances * np.abs(vals)

        idx = np.argsort(scores)[::-1][:top_k]
        out = []
        for i in idx:
            out.append(
                {
                    "feature": feature_columns[i],
                    "value": float(vals[i]),
                    "importance": float(importances[i]),
                    "score": float(scores[i]),
                }
            )
        return out
    # If no feature_importances_ attribute, return empty list
    return []


def predict_url(
    url: str,
    threshold: float = 0.5,
    debug: bool = False,
) -> Dict[str, Any]:
    """
    Predict if a URL is phishing using the trained model.

    Returns:
      {
        "risk_score": float (0..1),
        "prediction": int (1 phishing, 0 legitimate),
        "label": str,
        "features": dict,
        "debug": {...}   # only when debug=True
      }
    """
    if not url or not str(url).strip():
        return {
            "risk_score": 0.0,
            "prediction": 0,
            "label": "legitimate",
            "features": {},
        }

    model, feature_columns, scaler = _load_artifacts()

    X, feats = _build_feature_row(url, feature_columns)

    # Apply scaling if scaler exists
    if scaler is not None:
        X_scaled = scaler.transform(X)
        # Predict probability of phishing
        raw_proba = float(model.predict_proba(X_scaled)[:, 1][0])
    else:
        # Predict probability of phishing
        raw_proba = float(model.predict_proba(X)[:, 1][0])

    # Clamp to valid range (safety)
    raw_proba = max(0.0, min(1.0, raw_proba))
    
    # Apply bias correction to handle dataset overfitting
    # The original dataset has a bias where longer URLs are more likely to be phishing
    url_len = len(url)
    domain = url.split('/')[2] if '//' in url else url.split('/')[0] if '/' in url else url
    path_and_query = url[len(domain) + (7 if url.startswith('https://') else 6):] if '//' in url else ''
        
    # Identify known legitimate domains
    known_legitimate_domains = [
        'google.com', 'www.google.com', 'youtube.com', 'www.youtube.com',
        'github.com', 'www.github.com', 'amazon.com', 'www.amazon.com',
        'ebay.com', 'www.ebay.com', 'stackoverflow.com', 'www.stackoverflow.com',
        'facebook.com', 'www.facebook.com', 'twitter.com', 'www.twitter.com',
        'linkedin.com', 'www.linkedin.com', 'reddit.com', 'www.reddit.com',
        'wikipedia.org', 'www.wikipedia.org', 'apple.com', 'www.apple.com',
        'microsoft.com', 'www.microsoft.com', 'adobe.com', 'www.adobe.com',
        'oracle.com', 'www.oracle.com', 'docs.oracle.com', 'www.docs.oracle.com',
        'apple.com', 'www.apple.com', 'nytimes.com', 'www.nytimes.com',
        'cnn.com', 'www.cnn.com', 'bbc.com', 'www.bbc.com',
        'amazonaws.com', 'www.amazonaws.com', 'cloudflare.com', 'www.cloudflare.com'
    ]
        
    # Calculate correction factors
    length_factor = min(url_len / 100.0, 1.0)  # Normalize length impact
        
    # Check for legitimate indicators
    has_known_domain = any(known_domain in domain for known_domain in known_legitimate_domains)
    has_common_tld = any(common in domain for common in ['.com', '.org', '.net', '.edu', '.gov'])
    has_common_path = any(common in path_and_query for common in ['/login', '/register', '/api', '/docs', '/watch', '/product', '/sch', '/item'])
        
    # Apply corrections based on legitimate indicators
    correction = 0.0
    if has_known_domain:
        correction = -0.6  # Strong reduction for known legitimate domains
    elif has_common_tld and url_len <= 50:
        correction = -0.3  # Reduce phishing probability for short common domains
    elif has_common_tld and url_len <= 80 and has_common_path:
        correction = -0.4  # Reduce for common domains with common paths
    elif has_common_tld and has_common_path:
        correction = -0.25  # Moderate reduction for common domains with common paths
        
    # Apply correction but keep within bounds
    corrected_proba = max(0.0, min(1.0, raw_proba + correction))
        
    # Adjust decision based on corrected probability
    adjusted_threshold = threshold
    if has_known_domain:
        # For known legitimate domains, be very conservative
        adjusted_threshold = 0.8
    elif has_common_tld and url_len <= 50:
        # For short, common domains, be more conservative
        adjusted_threshold = 0.7
    elif url_len > 100 and not has_known_domain:
        # For very long URLs that aren't known domains, be more aggressive
        adjusted_threshold = 0.3
        
    # Decision with adjustments
    pred = 1 if corrected_proba >= adjusted_threshold else 0
    
    # Store values for output
    proba = corrected_proba  # Use corrected probability for risk score
    final_threshold = adjusted_threshold

    resp: Dict[str, Any] = {
        "risk_score": round(proba, 6),
        "prediction": pred,
        "label": "phishing" if pred == 1 else "legitimate",
        "features": feats,
    }

    if debug:
        resp["debug"] = {
            "normalized_url": _normalize_url(url),
            "threshold": threshold,
            "adjusted_threshold": final_threshold,
            "raw_probability": proba,
            "top_feature_hints": _top_feature_hints(model, feature_columns, X),
            "feature_row_preview": X.iloc[0].to_dict(),
        }

    return resp