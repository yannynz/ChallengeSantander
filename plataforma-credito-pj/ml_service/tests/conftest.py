from __future__ import annotations

from datetime import datetime, timedelta

import pandas as pd
import pytest


@pytest.fixture(scope="session", autouse=True)
def configure_database(tmp_path_factory, monkeypatch):
    db_path = tmp_path_factory.mktemp("ml_db") / "ml_test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+pysqlite:///{db_path}")

    from database import get_engine
    from data_access import schema

    engine = get_engine()
    schema.metadata.create_all(engine)

    # Seed baseline data used across tests
    now = datetime.utcnow()
    empresas = pd.DataFrame(
        [
            {"id": "CLI001", "cnpj": "00000000000001", "ds_cnae": "6201", "dt_abrt": "2010-01-10"},
            {"id": "CLI002", "cnpj": "00000000000002", "ds_cnae": "6202", "dt_abrt": "2015-05-15"},
            {"id": "CLI003", "cnpj": "00000000000003", "ds_cnae": "6203", "dt_abrt": "2018-09-20"},
        ]
    )
    financeiro = pd.DataFrame(
        [
            {"empresa_id": "CLI001", "dt_ref": "2024-05-01", "vl_fatu": 250000.0, "vl_sldo": 60000.0},
            {"empresa_id": "CLI002", "dt_ref": "2024-05-01", "vl_fatu": 180000.0, "vl_sldo": 35000.0},
            {"empresa_id": "CLI003", "dt_ref": "2024-05-01", "vl_fatu": 92000.0, "vl_sldo": 15000.0},
        ]
    )
    centralidade = pd.DataFrame(
        [
            {"empresa_id": "CLI001", "grau": 0.83, "betweenness": 0.55, "eigenvector": 0.74, "cluster_id": 1, "dt_calc": now.date()},
            {"empresa_id": "CLI002", "grau": 0.65, "betweenness": 0.44, "eigenvector": 0.52, "cluster_id": 1, "dt_calc": now.date()},
            {"empresa_id": "CLI003", "grau": 0.42, "betweenness": 0.31, "eigenvector": 0.28, "cluster_id": 2, "dt_calc": now.date()},
        ]
    )
    decisoes = pd.DataFrame(
        [
            {
                "empresa_id": "CLI001",
                "dt_decisao": (now - timedelta(days=10)).isoformat(),
                "score": 0.82,
                "aprovacao": True,
                "limite": 120000.0,
                "moeda": "BRL",
                "motivo": "upgrade limite",
            },
            {
                "empresa_id": "CLI001",
                "dt_decisao": (now - timedelta(days=70)).isoformat(),
                "score": 0.74,
                "aprovacao": True,
                "limite": 90000.0,
                "moeda": "BRL",
                "motivo": "ajuste limite",
            },
            {
                "empresa_id": "CLI002",
                "dt_decisao": (now - timedelta(days=20)).isoformat(),
                "score": 0.63,
                "aprovacao": True,
                "limite": 70000.0,
                "moeda": "BRL",
                "motivo": "ajuste limite",
            },
            {
                "empresa_id": "CLI003",
                "dt_decisao": (now - timedelta(days=12)).isoformat(),
                "score": 0.48,
                "aprovacao": False,
                "limite": 32000.0,
                "moeda": "BRL",
                "motivo": "inadimplencia",
            },
        ]
    )
    score_risco = pd.DataFrame(
        [
            {
                "empresa_id": "CLI001",
                "dt_calc": (now - timedelta(days=5)).isoformat(),
                "modelo": "rf",
                "score": 0.86,
                "auc_valid": 0.85,
                "threshold": 0.55,
                "versao_modelo": "rf-2024.05",
            },
            {
                "empresa_id": "CLI002",
                "dt_calc": (now - timedelta(days=8)).isoformat(),
                "modelo": "rf",
                "score": 0.67,
                "auc_valid": 0.83,
                "threshold": 0.55,
                "versao_modelo": "rf-2024.05",
            },
        ]
    )

    engine = get_engine()
    with engine.begin() as conn:
        empresas.to_sql("empresa", conn, if_exists="append", index=False)
        financeiro.to_sql("empresa_financeiro", conn, if_exists="append", index=False)
        centralidade.to_sql("centralidade_snapshot", conn, if_exists="append", index=False)
        decisoes.to_sql("decisao_credito", conn, if_exists="append", index=False)
        score_risco.to_sql("score_risco", conn, if_exists="append", index=False)

    yield engine

    schema.metadata.drop_all(engine)
