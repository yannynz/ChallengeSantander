import pandas as pd
from utils import get_engine

def load_base1(filepath: str):
    engine = get_engine()

    # Ler planilha
    base1 = pd.read_excel(filepath, sheet_name="Base 1 - ID")
    base1.columns = base1.columns.str.strip().str.upper()

    # Empresa
    empresas = base1[["ID", "DS_CNAE", "DT_ABRT"]].drop_duplicates()
    empresas = empresas.rename(columns={
        "ID": "id",
        "DS_CNAE": "ds_cnae",
        "DT_ABRT": "dt_abrt"
    })
    empresas["dt_abrt"] = pd.to_datetime(empresas["dt_abrt"], errors="coerce")

    empresas.to_sql("empresa", engine, if_exists="append", index=False)

    # Financeiro
    fin = base1[["ID", "DT_REFE", "VL_FATU", "VL_SLDO"]].copy()
    fin = fin.rename(columns={
        "ID": "empresa_id",
        "DT_REFE": "dt_ref",
        "VL_FATU": "vl_fatu",
        "VL_SLDO": "vl_sldo"
    })
    fin["dt_ref"] = pd.to_datetime(fin["dt_ref"], errors="coerce")

    fin.to_sql("empresa_financeiro", engine, if_exists="append", index=False)

    print("✅ Base 1 carregada com sucesso!")

if __name__ == "__main__":
    load_base1("../Challenge FIAP - Bases.xlsx")

