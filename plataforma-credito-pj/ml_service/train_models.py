import os
import pandas as pd
import joblib
from sqlalchemy import text
from utils import get_engine
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from pathlib import Path

def carregar_dados():
    """Carrega dados de empresa + financeiro para treinar modelo de risco"""
    try:
        engine = get_engine()
        query = """
        SELECT e.id,
               EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.dt_abrt)) AS idade,
               f.vl_fatu,
               f.vl_sldo
        FROM empresa e
        JOIN empresa_financeiro f ON e.id = f.empresa_id
        WHERE f.dt_ref = (
            SELECT MAX(f2.dt_ref)
            FROM empresa_financeiro f2
            WHERE f2.empresa_id = e.id
        )
        """
        df = pd.read_sql(text(query), engine)

        df["y"] = (df["vl_sldo"] < 0).astype(int)
        df = df.fillna(0)

        if df.empty:
            raise ValueError("Nenhum dado encontrado no banco para treinamento.")

        return df
    except Exception as e:
        raise RuntimeError(f"❌ Erro ao carregar dados: {e}")

def treinar_modelos():
    """Treina e salva RandomForest e XGBoost"""
    df = carregar_dados()
    X, y = df[["idade", "vl_fatu", "vl_sldo"]], df["y"]

    print(f"📊 Treinando modelos com {len(df)} registros...")

    rf = RandomForestClassifier(n_estimators=200, random_state=42)
    rf.fit(X, y)

    xgb = XGBClassifier(
        n_estimators=200,
        random_state=42,
        eval_metric="logloss",
        tree_method="hist"  # mais rápido e estável em produção
    )
    xgb.fit(X, y)

    models_dir = Path(__file__).resolve().parent / "models"
    models_dir.mkdir(exist_ok=True)

    joblib.dump(rf, models_dir / "rf_model.pkl")
    joblib.dump(xgb, models_dir / "xgb_model.pkl")

    print(f"✅ Modelos salvos em {models_dir}")

if __name__ == "__main__":
    try:
        treinar_modelos()
    except Exception as e:
        print(f"🔥 Falha no treinamento: {e}")
        exit(1)
