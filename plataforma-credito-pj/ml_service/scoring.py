from pathlib import Path
from typing import Tuple

import joblib
import math
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / "models"

try:
    rf_model = joblib.load(MODEL_PATH / "rf_model.pkl")
except Exception:  # pragma: no cover
    rf_model = None

try:
    xgb_model = joblib.load(MODEL_PATH / "xgb_model.pkl")
except Exception:  # pragma: no cover
    xgb_model = None


FEATURE_ORDER = ["idade", "vl_fatu", "vl_sldo"]


def _prepare_features(values: dict) -> pd.DataFrame:
    ordered = {column: values.get(column, 0) for column in FEATURE_ORDER}
    return pd.DataFrame([ordered])


def _select_model(modelo: str):
    if modelo == "xgb" and xgb_model:
        return xgb_model, "XGBoost"
    if modelo == "rf" and rf_model:
        return rf_model, "RandomForest"
    if rf_model:
        return rf_model, "RandomForest"
    if xgb_model:
        return xgb_model, "XGBoost"
    return None, "dummy"


def _probabilidades(model, X: pd.DataFrame) -> Tuple[float, float]:
    """Retorna (prob_bom, prob_risco)."""
    if hasattr(model, "predict_proba"):
        probabilidades = model.predict_proba(X)
        if probabilidades.ndim == 2 and probabilidades.shape[1] >= 2:
            classes = getattr(model, "classes_", None)
            classes = list(classes) if classes is not None else [0, 1]
            try:
                idx_bom = classes.index(0)
            except ValueError:
                idx_bom = 0
            idx_risco = 1 - idx_bom if len(classes) > 1 else idx_bom
            bom = float(probabilidades[:, idx_bom][0])
            risco = float(probabilidades[:, idx_risco][0])
        else:
            bom = float(probabilidades[0])
            risco = 1.0 - bom
    elif hasattr(model, "predict"):
        predicted = float(model.predict(X)[0])
        risco = min(max(predicted, 0.0), 1.0)
        bom = 1.0 - risco
    else:
        bom = risco = 0.5

    if not math.isfinite(bom):
        bom = 0.5
    if not math.isfinite(risco):
        risco = 0.5

    return float(min(max(bom, 0.0), 1.0)), float(min(max(risco, 0.0), 1.0))


def calcular_score(features: dict, modelo: str = "rf") -> Tuple[float, str]:
    X = _prepare_features(features)
    model, nome_modelo = _select_model(modelo)

    if model is None:
        return 0.5, "dummy"

    prob_bom, prob_risco = _probabilidades(model, X)

    # Preferimos a probabilidade do bom pagador como score da aplicação
    score = prob_bom

    # Reforça consistência numérica quando risco possui maior precisão
    if abs((1.0 - prob_risco) - prob_bom) > 1e-6:
        score = float(1.0 - prob_risco)

    return score, nome_modelo
