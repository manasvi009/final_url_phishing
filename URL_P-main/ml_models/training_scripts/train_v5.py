import os, sys, random
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.preprocessing import StandardScaler
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
    "/search", "/news", "/updates", "/profile", "/login", "/register",
    "/dashboard", "/settings", "/admin", "/api/v1", "/api/v2", "/rest",
    "/wp-admin", "/wp-content", "/cgi-bin", "/assets", "/static"
]

COMMON_QUERIES = [
    "?q=test", "?q=python", "?page=2", "?ref=home", "?utm_source=google",
    "?id=12345", "?category=tech", "?sort=latest", "?lang=en", "?version=1",
    "&token=abc123", "&session=xyz789", "&auth=true", "&redirect=/home"
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
    Focus on creating longer legitimate URLs to balance the dataset.
    """
    legit_urls = df_legit["url"].sample(min(len(df_legit), 15000), random_state=42).tolist()
    out = []

    for _ in range(n):
        base = normalize_url(random.choice(legit_urls))

        # Add multiple paths and queries to make URLs longer
        num_components = random.randint(2, 5)  # Add 2-5 components to make longer URLs
        url_parts = [base.rstrip("/")]
        
        for _ in range(num_components):
            if random.random() > 0.5:  # Add path
                url_parts.append(random.choice(COMMON_PATHS))
            else:  # Add query
                url_parts.append(random.choice(COMMON_QUERIES))
        
        constructed_url = "".join(url_parts)
        out.append(constructed_url)

    return out

def generate_balanced_dataset(df_original: pd.DataFrame, target_ratio: float = 1.0):
    """
    Generate a more balanced dataset by creating additional legitimate examples
    that have longer URL patterns to counteract the bias.
    """
    legit = df_original[df_original["label"] == 0]
    phishing = df_original[df_original["label"] == 1]
    
    print(f"Original dataset - Legit: {len(legit)}, Phishing: {len(phishing)}")
    
    # Calculate how many additional legitimate samples we need
    # We want to balance both the classes and the URL length distributions
    orig_legit_mean_len = legit["url"].apply(len).mean()
    orig_phish_mean_len = phishing["url"].apply(len).mean()
    
    print(f"Original mean lengths - Legit: {orig_legit_mean_len:.2f}, Phishing: {orig_phish_mean_len:.2f}")
    
    # Generate longer legitimate URLs to balance the length distribution
    deep_legit = generate_legit_deep_urls(legit, n=35000)  # Increased number to balance better
    
    # Create additional dataset with longer legitimate URLs
    aug = pd.DataFrame({"url": deep_legit, "label": 0})
    
    # Combine original and augmented datasets
    df_combined = pd.concat([df_original, aug], ignore_index=True)
    
    # Sample to maintain class balance while preserving longer legitimate URLs
    legit_combined = df_combined[df_combined["label"] == 0]
    phishing_combined = df_combined[df_combined["label"] == 1]
    
    # Limit phishing samples if we have more than legitimate after augmentation
    if len(phishing_combined) > len(legit_combined):
        phishing_combined = phishing_combined.sample(n=len(legit_combined), random_state=42)
    elif len(legit_combined) > len(phishing_combined):
        # If we have too many legitimate, sample down but preserve longer ones
        legit_long = legit_combined[legit_combined["url"].apply(len) > 40]  # Preserve longer ones
        legit_short = legit_combined[legit_combined["url"].apply(len) <= 40]
        
        # Keep all long legitimate URLs and sample from short ones
        if len(legit_long) >= len(phishing_combined):
            legit_final = legit_long.sample(n=len(phishing_combined), random_state=42)
        else:
            remaining_count = len(phishing_combined) - len(legit_long)
            legit_short_sample = legit_short.sample(n=remaining_count, random_state=42)
            legit_final = pd.concat([legit_long, legit_short_sample], ignore_index=True)
        
        df_balanced = pd.concat([legit_final, phishing_combined], ignore_index=True)
    else:
        df_balanced = df_combined
    
    print(f"After balancing - Legit: {len(df_balanced[df_balanced['label']==0])}, Phishing: {len(df_balanced[df_balanced['label']==1])}")
    
    # Print stats about URL lengths after balancing
    legit_after = df_balanced[df_balanced["label"] == 0]["url"].apply(len)
    phish_after = df_balanced[df_balanced["label"] == 1]["url"].apply(len)
    print(f"After balancing - Legit mean length: {legit_after.mean():.2f}, Phishing mean length: {phish_after.mean():.2f}")
    
    return df_balanced

def main():
    df = load_data()
    print("Original:", df["label"].value_counts().to_dict())

    # Create a more balanced dataset
    df_balanced = generate_balanced_dataset(df)
    print("After balancing:", df_balanced["label"].value_counts().to_dict())

    # Extract features
    print("Extracting features...")
    X_raw_features = extract_features_df(df_balanced["url"].tolist())
    X = pd.DataFrame(X_raw_features).replace([np.inf, -np.inf], np.nan).fillna(0)
    
    # Apply feature scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=X.columns)
    
    y = df_balanced["label"].values

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, stratify=y, random_state=42
    )

    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    # Train the model with adjusted parameters for better generalization
    model = XGBClassifier(
        n_estimators=600,  # Reduced to prevent overfitting
        max_depth=5,       # Reduced depth to prevent overfitting to specific patterns
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=2.0,    # Increased regularization
        reg_alpha=0.5,     # Added L1 regularization
        min_child_weight=5, # Increased to prevent overfitting
        eval_metric="logloss",
        tree_method="hist",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # Evaluate
    proba = model.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)

    print("\n=== Classification Report ===")
    print(classification_report(y_test, pred, digits=4))
    print("\n=== Confusion Matrix ===")
    print(confusion_matrix(y_test, pred))
    print("\nROC-AUC:", round(roc_auc_score(y_test, proba), 6))

    # Save artifacts
    (BACKEND_DIR / "models").mkdir(parents=True, exist_ok=True)
    joblib.dump(model, BACKEND_DIR / "models" / "phishing_model_v5.pkl")
    joblib.dump(list(X.columns), BACKEND_DIR / "models" / "feature_columns_v5.pkl")
    joblib.dump(scaler, BACKEND_DIR / "models" / "feature_scaler_v5.pkl")
    print("\n✅ Saved v5 model, feature columns, and scaler")

if __name__ == "__main__":
    main()