import os, sys, random
from pathlib import Path
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

random.seed(42)
np.random.seed(42)

COMMON_PATHS = [
    "/about", "/contact", "/help", "/support", "/docs", "/blog",
    "/products", "/pricing", "/terms", "/privacy", "/account",
    "/search", "/news", "/updates", "/profile"
]

COMMON_QUERIES = [
    "?q=test", "?q=python", "?page=2", "?ref=home", "?utm_source=google",
    "?id=12345", "?category=tech", "?sort=latest"
]

def load_data():
    # Look for dataset in ml_models/datasets first, fallback to backend/data
    dataset_path = os.getenv("DATASET_PATH", str(Path(__file__).parent.parent / "datasets" / "phishing_url_dataset_unique.csv"))
    if not Path(dataset_path).exists():
        dataset_path = str(BACKEND_DIR / "data" / "phishing_url_dataset_unique.csv")
    df = pd.read_csv(dataset_path)[["url","label"]].dropna()
    df["label"] = df["label"].astype(int)
    df = df[df["label"].isin([0,1])]
    df = df.drop_duplicates(subset=["url"])
    return df

def normalize_url(u: str) -> str:
    u = str(u).strip()
    if not u.startswith("http"):
        u = "http://" + u
    return u

def generate_legit_deep_urls(df_legit: pd.DataFrame, n: int = 20000):
    """
    Build lots of legit deep URLs by taking legit base domains and adding paths/queries.
    """
    legit_urls = df_legit["url"].sample(min(len(df_legit), 15000), random_state=42).tolist()
    out = []

    for _ in range(n):
        base = normalize_url(random.choice(legit_urls))

        path = random.choice(COMMON_PATHS)
        query = random.choice(COMMON_QUERIES)

        # make variations: sometimes only path, sometimes only query, sometimes both
        mode = random.randint(1, 3)
        if mode == 1:
            out.append(base.rstrip("/") + path)
        elif mode == 2:
            out.append(base.rstrip("/") + query)
        else:
            out.append(base.rstrip("/") + path + query)

    return out

def main():
    df = load_data()
    print("Original:", df["label"].value_counts().to_dict())

    legit = df[df["label"] == 0]
    phishing = df[df["label"] == 1]

    # ✅ add many deep legit urls
    deep_legit = generate_legit_deep_urls(legit, n=30000)
    aug = pd.DataFrame({"url": deep_legit, "label": 0})

    df2 = pd.concat([df, aug], ignore_index=True)
    print("After augment:", df2["label"].value_counts().to_dict())

    X = pd.DataFrame(extract_features_df(df2["url"].tolist())).replace([np.inf, -np.inf], np.nan).fillna(0)
    y = df2["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    model = XGBClassifier(
        n_estimators=800,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss",
        tree_method="hist",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)

    print("\n=== Classification Report ===")
    print(classification_report(y_test, pred, digits=4))
    print("\n=== Confusion Matrix ===")
    print(confusion_matrix(y_test, pred))
    print("\nROC-AUC:", round(roc_auc_score(y_test, proba), 6))

    (BACKEND_DIR / "models").mkdir(parents=True, exist_ok=True)
    joblib.dump(model, BACKEND_DIR / "models" / "phishing_model_v4.pkl")
    joblib.dump(list(X.columns), BACKEND_DIR / "models" / "feature_columns_v4.pkl")
    print("\n✅ Saved v4 model")

if __name__ == "__main__":
    main()