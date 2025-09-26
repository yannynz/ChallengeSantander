from pathlib import Path
import joblib
import pandas as pd

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


FEATURE_ORDER = ["idade", "vl_fatu", "vl_sldo"]


def _prepare_features(values: dict) -> pd.DataFrame:
    ordered = {column: values.get(column, 0) for column in FEATURE_ORDER}
    return pd.DataFrame([ordered])


def calcular_score(features: dict, modelo: str = "rf"):
    X = _prepare_features(features)

    if modelo == "rf" and rf_model:
        return float(rf_model.predict_proba(X)[:, 1][0]), "RandomForest"
    elif modelo == "xgb" and xgb_model:
        return float(xgb_model.predict_proba(X)[:, 1][0]), "XGBoost"
    else:
        # fallback
        return 0.5, "dummy"
