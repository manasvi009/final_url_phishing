# backend/training/train_v2.py
# Retrain with:
# - more realistic legitimate URLs (adds deep URLs)
# - down-weight query-based bias by adding legit examples with queries
# - saves new model: phishing_model_v2.pkl + feature_columns_v2.pkl

import os
import sys
from pathlib import Path
import random

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from xgboost import XGBClassifier

THIS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = THIS_DIR.parent
sys.path.append(str(BACKEND_DIR))

from app.feature_extractor import extract_features_df  # noqa: E402


RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# ✅ Add realistic "deep" legitimate URLs (queries + paths)
LEGIT_DEEP_URLS = [
    "https://www.google.com/search?q=test",
    "https://www.google.com/search?q=python+fastapi",
    "https://www.youtube.com/watch?v=Vi9bxu-M-ag&list=PLDzeHZWIZsTo0wSBcg4-NMIbC0L8evLrD",
    "https://github.com/openai/openai-python",
    "https://github.com/user/repo/issues/123?sort=created",
    "https://docs.python.org/3/library/urllib.parse.html",
    "https://stripe.com/docs/api/payment_intents",
    "https://en.wikipedia.org/wiki/Phishing",
    "https://www.amazon.in/s?k=mobile+phone",
    "https://www.microsoft.com/en-in/microsoft-365",
    "https://accounts.google.com/signin/v2/identifier?service=mail",
]

def ensure_dirs():
    (BACKEND_DIR / "models").mkdir(parents=True, exist_ok=True)

def load_data():
    dataset_path = os.getenv(
        "DATASET_PATH",
        str(BACKEND_DIR / "data" / "phishing_url_dataset_unique.csv"),
    )
    df = pd.read_csv(dataset_path)
    df = df[["url", "label"]].dropna()
    df["label"] = df["label"].astype(int)
    df = df[df["label"].isin([0, 1])]
    df = df.drop_duplicates(subset=["url"])
    return df

def augment_legitimate(df: pd.DataFrame, copies_per_url: int = 800):
    """
    Add deep legitimate URLs many times to fight bias.
    We replicate them so the model sees many safe query URLs.
    """
    legit_rows = []
    for u in LEGIT_DEEP_URLS:
        for _ in range(copies_per_url):
            legit_rows.append({"url": u, "label": 0})
    aug = pd.DataFrame(legit_rows)
    out = pd.concat([df, aug], ignore_index=True)
    out = out.drop_duplicates(subset=["url", "label"])
    return out

def build_features(df: pd.DataFrame):
    feats = extract_features_df(df["url"].tolist())
    X = pd.DataFrame(feats).replace([np.inf, -np.inf], np.nan).fillna(0)
    y = df["label"].values
    return X, y

def train_model(X_train, y_train):
    model = XGBClassifier(
        n_estimators=600,
        max_depth=6,
        learning_rate=0.06,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        reg_alpha=0.0,
        min_child_weight=1,
        objective="binary:logistic",
        eval_metric="logloss",
        tree_method="hist",
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model

def main():
    ensure_dirs()
    df = load_data()
    print("Original:", df["label"].value_counts().to_dict())

    # ✅ augment
    df = augment_legitimate(df, copies_per_url=800)
    print("After augment:", df["label"].value_counts().to_dict())

    X, y = build_features(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=y,
    )

    model = train_model(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)

    print("\n=== Classification Report ===")
    print(classification_report(y_test, pred, digits=4))

    print("\n=== Confusion Matrix ===")
    print(confusion_matrix(y_test, pred))

    print("\nROC-AUC:", round(roc_auc_score(y_test, proba), 6))

    # ✅ save NEW artifacts
    model_path = BACKEND_DIR / "models" / "phishing_model_v2.pkl"
    cols_path = BACKEND_DIR / "models" / "feature_columns_v2.pkl"
    joblib.dump(model, model_path)
    joblib.dump(list(X.columns), cols_path)

    print(f"\n✅ Saved: {model_path}")
    print(f"✅ Saved: {cols_path}")

if __name__ == "__main__":
    main()