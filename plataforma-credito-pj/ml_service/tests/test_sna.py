from uuid import uuid4

import pandas as pd
from sqlalchemy import inspect, text

from sna import calcular_centralidades
from utils import get_engine


def test_sna_runs():
    engine = get_engine()

    suffix = uuid4().hex[:6].upper()
    empresas_ids = [f"TEST_{suffix}_{tag}" for tag in ("A", "B", "C")]

    empresas_df = pd.DataFrame(
        [
            {"id": empresas_ids[0], "cnpj": "10000000000001", "ds_cnae": "6201", "dt_abrt": "2020-01-01"},
            {"id": empresas_ids[1], "cnpj": "10000000000002", "ds_cnae": "6202", "dt_abrt": "2020-01-01"},
            {"id": empresas_ids[2], "cnpj": "10000000000003", "ds_cnae": "6203", "dt_abrt": "2020-01-01"},
        ]
    )

    transacoes_df = pd.DataFrame(
        [
            {"id_pgto": empresas_ids[0], "id_rcbe": empresas_ids[1], "vl": 100, "dt_ref": "2023-01-01"},
            {"id_pgto": empresas_ids[1], "id_rcbe": empresas_ids[2], "vl": 200, "dt_ref": "2023-01-01"},
        ]
    )

    params = {"a": empresas_ids[0], "b": empresas_ids[1], "c": empresas_ids[2]}

    def cleanup(conn):
        inspector = inspect(conn)
        if inspector.has_table("centralidade_snapshot"):
            conn.execute(
                text("DELETE FROM centralidade_snapshot WHERE empresa_id IN (:a, :b, :c)"),
                params,
            )
        if inspector.has_table("transacao"):
            conn.execute(
                text(
                    "DELETE FROM transacao WHERE id_pgto IN (:a, :b, :c) "
                    "OR id_rcbe IN (:a, :b, :c)"
                ),
                params,
            )
        if inspector.has_table("empresa"):
            conn.execute(
                text("DELETE FROM empresa WHERE id IN (:a, :b, :c)"),
                params,
            )

    with engine.begin() as conn:
        cleanup(conn)
        empresas_df.to_sql("empresa", conn, if_exists="append", index=False)
        transacoes_df.to_sql("transacao", conn, if_exists="append", index=False)

    try:
        calcular_centralidades()
        snapshot = pd.read_sql(
            "SELECT empresa_id FROM centralidade_snapshot WHERE empresa_id IN (:a, :b, :c)",
            engine,
            params=params,
        )
        assert set(snapshot["empresa_id"]) == set(empresas_ids)
    finally:
        with engine.begin() as conn:
            cleanup(conn)
