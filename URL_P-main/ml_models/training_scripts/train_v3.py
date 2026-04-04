import os, sys, random, string
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

LEGIT_BASE = [
    "https://www.google.com/search",
    "https://www.youtube.com/watch",
    "https://github.com/openai/openai-python",
    "https://stripe.com/docs/api/payment_intents",
    "https://en.wikipedia.org/wiki/Phishing",
]

def rand_token(n=8):
    return "".join(random.choices(string.ascii_letters + string.digits, k=n))

def make_legit_variants(n=5000):
    urls = []
    for _ in range(n):
        base = random.choice(LEGIT_BASE)

        if "google.com/search" in base:
            q = random.choice(["test","python","fastapi","ml","react","mongodb"])
            urls.append(f"{base}?q={q}&src={rand_token(6)}")

        elif "youtube.com/watch" in base:
            v = rand_token(11)
            urls.append(f"{base}?v={v}&list={rand_token(16)}")

        elif "github.com/openai/openai-python" in base:
            urls.append(f"{base}/issues/{random.randint(1,500)}?sort=created&filter={rand_token(5)}")

        elif "stripe.com/docs" in base:
            urls.append(f"{base}?version={random.randint(1,5)}&ref={rand_token(6)}")

        else:
            urls.append(f"{base}?ref={rand_token(6)}&utm={rand_token(5)}")

    return urls

def load_data():
    dataset_path = os.getenv("DATASET_PATH", str(BACKEND_DIR / "data" / "phishing_url_dataset_unique.csv"))
    df = pd.read_csv(dataset_path)[["url","label"]].dropna()
    df["label"] = df["label"].astype(int)
    df = df[df["label"].isin([0,1])]
    df = df.drop_duplicates(subset=["url"])
    return df

def main():
    df = load_data()
    print("Original:", df["label"].value_counts().to_dict())

    # ✅ add many UNIQUE legit deep URLs
    variants = make_legit_variants(n=10000)
    aug = pd.DataFrame({"url": variants, "label": 0})
    df2 = pd.concat([df, aug], ignore_index=True)

    print("After augment:", df2["label"].value_counts().to_dict())

    X = pd.DataFrame(extract_features_df(df2["url"].tolist())).replace([np.inf, -np.inf], np.nan).fillna(0)
    y = df2["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=700,
        max_depth=6,
        learning_rate=0.06,
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
    joblib.dump(model, BACKEND_DIR / "models" / "phishing_model_v3.pkl")
    joblib.dump(list(X.columns), BACKEND_DIR / "models" / "feature_columns_v3.pkl")
    print("\n✅ Saved v3 model")

if __name__ == "__main__":
    main()