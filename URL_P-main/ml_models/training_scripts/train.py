# backend/training/train.py
# Train an XGBoost phishing URL classifier using engineered URL features.
# Dataset expected columns: url, label  (label: 1=phishing, 0=legitimate)

import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

from xgboost import XGBClassifier


# --- Make app/ importable (so we can import feature_extractor.py) ---
THIS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = THIS_DIR.parent
APP_DIR = BACKEND_DIR / "app"
sys.path.append(str(BACKEND_DIR))  # so "app" becomes importable


from app.feature_extractor import extract_features_df  # noqa: E402


def ensure_dirs():
    (BACKEND_DIR / "models").mkdir(parents=True, exist_ok=True)
    (BACKEND_DIR / "artifacts").mkdir(parents=True, exist_ok=True)


def load_data(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset not found: {csv_path}")
    df = pd.read_csv(csv_path)

    required = {"url", "label"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing columns: {missing}. Found: {list(df.columns)}")

    df = df[["url", "label"]].dropna()
    df = df.drop_duplicates(subset=["url"])
    # Ensure label is 0/1 integer
    df["label"] = df["label"].astype(int)
    df = df[df["label"].isin([0, 1])]

    return df


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    feats = extract_features_df(df["url"].tolist())
    X = pd.DataFrame(feats)

    # Replace any inf/nan (just in case) with 0
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

    return X


def train_xgb(X_train, y_train):
    # Good default params for tabular classification
    model = XGBClassifier(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        reg_alpha=0.0,
        min_child_weight=1,
        objective="binary:logistic",
        eval_metric="logloss",
        tree_method="hist",  # fast on CPU
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model


def evaluate(model, X_test, y_test):
    proba = model.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)

    print("\n=== Classification Report (threshold=0.5) ===")
    print(classification_report(y_test, pred, digits=4))

    print("\n=== Confusion Matrix ===")
    print(confusion_matrix(y_test, pred))

    try:
        auc = roc_auc_score(y_test, proba)
        print(f"\nROC-AUC: {auc:.4f}")
    except Exception:
        pass

    return proba, pred


def save_artifacts(model, feature_columns, out_dir: Path):
    model_path = out_dir / "phishing_model.pkl"
    cols_path = out_dir / "feature_columns.pkl"

    joblib.dump(model, model_path)
    joblib.dump(feature_columns, cols_path)

    print(f"\n✅ Saved model: {model_path}")
    print(f"✅ Saved feature columns: {cols_path}")


def main():
    ensure_dirs()

    # Use env or default dataset location
    dataset_path = os.getenv(
        "DATASET_PATH",
        str(BACKEND_DIR / "data" / "phishing_url_dataset_unique.csv"),
    )
    dataset_path = Path(dataset_path)

    print(f"Loading dataset: {dataset_path}")
    df = load_data(dataset_path)
    print(f"Rows after cleaning: {len(df):,}")

    # Build features
    print("Extracting features (this may take a bit for large datasets)...")
    X = build_feature_frame(df)
    y = df["label"].values

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    print(f"Train size: {len(X_train):,} | Test size: {len(X_test):,}")
    print("Training XGBoost model...")
    model = train_xgb(X_train, y_train)

    # Evaluate
    evaluate(model, X_test, y_test)

    # Save model + column order (important for inference)
    out_dir = BACKEND_DIR / "models"
    save_artifacts(model, list(X.columns), out_dir)


if __name__ == "__main__":
    main()