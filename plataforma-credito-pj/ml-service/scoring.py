import pandas as pd
import joblib
from pathlib import Path

# Carregar modelos salvos
MODEL_PATH = Path(__file__).resolve().parent / "models"

try:
    rf_model = joblib.load(MODEL_PATH / "rf_model.pkl")
except:
    rf_model = None

try:
    xgb_model = joblib.load(MODEL_PATH / "xgb_model.pkl")
except:
    xgb_model = None


def calcular_score(features: dict, modelo: str = "rf"):
    X = pd.DataFrame([features])

    if modelo == "rf" and rf_model:
        return float(rf_model.predict_proba(X)[:, 1][0]), "RandomForest"
    elif modelo == "xgb" and xgb_model:
        return float(xgb_model.predict_proba(X)[:, 1][0]), "XGBoost"
    else:
        # fallback
        return 0.5, "dummy"

