# backend/training/evaluate.py
# Evaluate trained phishing detection model

import sys
from pathlib import Path
import joblib
import pandas as pd
import numpy as np

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    roc_curve
)

import matplotlib.pyplot as plt


# --- Setup paths ---
THIS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = THIS_DIR.parent
APP_DIR = BACKEND_DIR / "app"
MODELS_DIR = BACKEND_DIR / "models"
DATA_DIR = BACKEND_DIR / "data"

sys.path.append(str(BACKEND_DIR))

from app.feature_extractor import extract_features_df  # noqa: E402


def load_model():
    model = joblib.load(MODELS_DIR / "phishing_model.pkl")
    feature_columns = joblib.load(MODELS_DIR / "feature_columns.pkl")
    return model, feature_columns


def load_data():
    df = pd.read_csv(DATA_DIR / "phishing_url_dataset_unique.csv")
    df = df[["url", "label"]].dropna()
    df["label"] = df["label"].astype(int)
    return df


def evaluate():
    print("Loading model...")
    model, feature_columns = load_model()

    print("Loading dataset...")
    df = load_data()

    print("Extracting features...")
    X = pd.DataFrame(extract_features_df(df["url"]))
    X = X[feature_columns]  # Ensure correct order
    y = df["label"].values

    print("Predicting...")
    probabilities = model.predict_proba(X)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)

    # Classification report
    print("\n==============================")
    print("Classification Report")
    print("==============================")
    print(classification_report(y, predictions, digits=4))

    # Confusion Matrix
    print("\n==============================")
    print("Confusion Matrix")
    print("==============================")
    print(confusion_matrix(y, predictions))

    # ROC-AUC
    auc = roc_auc_score(y, probabilities)
    print(f"\nROC-AUC Score: {auc:.4f}")

    # Plot ROC Curve
    fpr, tpr, _ = roc_curve(y, probabilities)

    plt.figure()
    plt.plot(fpr, tpr, label=f"AUC = {auc:.4f}")
    plt.plot([0, 1], [0, 1], linestyle="--")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve - Phishing Detection")
    plt.legend()
    plt.show()

    # Feature Importance
    print("\n==============================")
    print("Top 15 Feature Importance")
    print("==============================")

    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1][:15]

    for i in indices:
        print(f"{feature_columns[i]}: {importances[i]:.4f}")

    plt.figure()
    plt.title("Top 15 Feature Importance")
    plt.barh(
        [feature_columns[i] for i in indices][::-1],
        importances[indices][::-1]
    )
    plt.xlabel("Importance Score")
    plt.show()


if __name__ == "__main__":
    evaluate()