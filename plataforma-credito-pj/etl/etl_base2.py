import pandas as pd
from utils import get_engine


def _normalize_excel_date(series: pd.Series) -> pd.Series:
    if series.empty:
        return series

    numeric = pd.to_numeric(series, errors="coerce")
    as_dates = pd.to_datetime(numeric, unit="D", origin="1899-12-30", errors="coerce")
    fallback = pd.to_datetime(series, errors="coerce")
    result = as_dates.fillna(fallback)
    return result.dt.date

def load_base2(filepath: str):
    engine = get_engine()

    # Ler planilha
    base2 = pd.read_excel(filepath, sheet_name="Base 2 - Transações")
    base2.columns = base2.columns.str.strip().str.upper()

    # Transações
    trans = base2.rename(columns={
        "ID_PGTO": "id_pgto",
        "ID_RCBE": "id_rcbe",
        "VL": "vl",
        "DS_TRAN": "ds_tran",
        "DT_REFE": "dt_ref"
    })

    trans["id_pgto"] = trans["id_pgto"].astype(str).str.strip()
    trans["id_rcbe"] = trans["id_rcbe"].astype(str).str.strip()
    trans["vl"] = pd.to_numeric(trans["vl"], errors="coerce")
    trans["dt_ref"] = _normalize_excel_date(trans["dt_ref"])

    trans = trans.dropna(subset=["id_pgto", "id_rcbe", "dt_ref"])

    trans.to_sql("transacao", engine, if_exists="append", index=False)

    print("✅ Base 2 carregada com sucesso!")

if __name__ == "__main__":
        load_base2("Challenge FIAP - Bases.xlsx")
