import pandas as pd
import joblib
from sqlalchemy import text
from utils import get_engine
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
import numpy as np
from pathlib import Path

def carregar_dados():
    """ Carrega dados de empresa + financeiro para treinar modelo de risco """
    engine = get_engine()

    # Empresa + financeiro (última referência de cada empresa)
    query = """
    SELECT e.id,
           EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.dt_abrt)) AS idade,
           f.vl_fatu,
           f.vl_sldo
    FROM empresa e
    JOIN empresa_financeiro f ON e.id = f.empresa_id
    WHERE f.dt_ref = (SELECT MAX(f2.dt_ref) FROM empresa_financeiro f2 WHERE f2.empresa_id = e.id)
    """
    df = pd.read_sql(text(query), engine)

    # Criar variável alvo fictícia: se saldo < 0, consideramos "risco"
    df["y"] = (df["vl_sldo"] < 0).astype(int)

    # Substituir NaN por zero
    df = df.fillna(0)
    return df

def treinar_modelos():
    df = carregar_dados()

    X = df[["idade", "vl_fatu", "vl_sldo"]]
    y = df["y"]

    # RandomForest
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X, y)

    # XGBoost
    xgb = XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric="logloss")
    xgb.fit(X, y)

    # Salvar modelos
    models_dir = Path(__file__).resolve().parent / "models"
    models_dir.mkdir(exist_ok=True)

    joblib.dump(rf, models_dir / "rf_model.pkl")
    joblib.dump(xgb, models_dir / "xgb_model.pkl")

    print("✅ Modelos treinados e salvos em ml-service/models/")

if __name__ == "__main__":
    treinar_modelos()

