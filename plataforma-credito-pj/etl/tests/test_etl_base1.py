import pandas as pd

from etl_base1 import load_base1
from utils import get_engine


def _mock_base():
    return pd.DataFrame(
        [
            {
                "ID": "EMP_01",
                "DS_CNAE": "Tech",
                "DT_ABRT": "2020-01-01",
                "DT_REFE": "2024-01-01",
                "VL_FATU": 100.0,
                "VL_SLDO": 10.0,
            },
            {
                "ID": "EMP_01",
                "DS_CNAE": "Tech",
                "DT_ABRT": "2020-01-01",
                "DT_REFE": "2024-02-01",
                "VL_FATU": 150.0,
                "VL_SLDO": -5.0,
            },
            {
                "ID": "EMP_02",
                "DS_CNAE": "Retail",
                "DT_ABRT": "2021-03-15",
                "DT_REFE": "2024-01-01",
                "VL_FATU": 200.0,
                "VL_SLDO": 50.0,
            },
        ]
    )


def test_load_base1_upsert(tmp_path, monkeypatch):
    db_path = tmp_path / "etl_test.sqlite"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    base = _mock_base()
    monkeypatch.setattr(pd, "read_excel", lambda *args, **kwargs: base.copy())

    engine = get_engine()
    with engine.begin() as conn:
        conn.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS empresa (
                id TEXT PRIMARY KEY,
                ds_cnae TEXT,
                dt_abrt DATE
            )
            """
        )
        conn.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS empresa_financeiro (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empresa_id TEXT,
                dt_ref DATE,
                vl_fatu NUMERIC,
                vl_sldo NUMERIC,
                UNIQUE (empresa_id, dt_ref)
            )
            """
        )

    load_base1("dummy.xlsx")

    empresas = pd.read_sql_query("SELECT * FROM empresa", engine)
    financeiro = pd.read_sql_query("SELECT * FROM empresa_financeiro", engine)

    assert len(empresas) == 2
    assert sorted(empresas["id"].tolist()) == ["EMP_01", "EMP_02"]
    assert len(financeiro) == 3

    # Segunda carga com dados alterados -> deve atualizar sem duplicar
    base_updated = base.copy()
    base_updated.loc[1, "VL_SLDO"] = -10.0
    monkeypatch.setattr(pd, "read_excel", lambda *args, **kwargs: base_updated.copy())

    load_base1("dummy.xlsx")

    financeiro_after = pd.read_sql_query("SELECT * FROM empresa_financeiro", engine)
    assert len(financeiro_after) == 3
    saldo_emp01 = financeiro_after.sort_values(["empresa_id", "dt_ref"]).iloc[1]["vl_sldo"]
    assert saldo_emp01 == -10.0
