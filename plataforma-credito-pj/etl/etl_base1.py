from typing import Optional

import pandas as pd
from sqlalchemy import inspect

from utils import get_engine, upsert_dataframe


def _normalize_cnpj(identifier: str) -> Optional[str]:
    if not isinstance(identifier, str):
        return None

    digits = ''.join(ch for ch in identifier if ch.isdigit())
    if not digits:
        return None

    digits = digits[-14:]
    if len(digits) < 14:
        digits = digits.zfill(14)
    return digits

def load_base1(filepath: str):
    engine = get_engine()

    base1 = pd.read_excel(filepath, sheet_name="Base 1 - ID")
    base1.columns = base1.columns.str.strip().str.upper()

    empresas = base1[["ID", "DS_CNAE", "DT_ABRT"]].drop_duplicates()
    empresas = empresas.rename(columns={
        "ID": "id",
        "DS_CNAE": "ds_cnae",
        "DT_ABRT": "dt_abrt"
    })
    empresas["dt_abrt"] = pd.to_datetime(empresas["dt_abrt"], errors="coerce")

    empresas["dt_abrt"] = empresas["dt_abrt"].dt.date
    empresas = empresas.dropna(subset=["id"])

    empresas["id"] = empresas["id"].astype(str).str.strip()
    empresas["cnpj"] = empresas["id"].apply(_normalize_cnpj)

    inspector = inspect(engine)
    has_cnpj = inspector.has_table("empresa") and any(
        column.get("name") == "cnpj" for column in inspector.get_columns("empresa")
    )

    payload = empresas if has_cnpj else empresas.drop(columns=["cnpj"], errors="ignore")

    upsert_dataframe(engine, payload, "empresa", ["id"])

    fin = base1[["ID", "DT_REFE", "VL_FATU", "VL_SLDO"]].copy()
    fin = fin.rename(columns={
        "ID": "empresa_id",
        "DT_REFE": "dt_ref",
        "VL_FATU": "vl_fatu",
        "VL_SLDO": "vl_sldo"
    })
    fin["dt_ref"] = pd.to_datetime(fin["dt_ref"], errors="coerce")

    fin["dt_ref"] = fin["dt_ref"].dt.date
    fin = fin.dropna(subset=["empresa_id", "dt_ref"])
    upsert_dataframe(engine, fin, "empresa_financeiro", ["empresa_id", "dt_ref"])

    print("✅ Base 1 carregada com sucesso!")

if __name__ == "__main__":
    load_base1("Challenge FIAP - Bases.xlsx")
