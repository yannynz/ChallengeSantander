import pandas as pd
from utils import get_engine

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
    trans["dt_ref"] = pd.to_datetime(trans["dt_ref"], errors="coerce")

    trans.to_sql("transacao", engine, if_exists="append", index=False)

    print("✅ Base 2 carregada com sucesso!")

if __name__ == "__main__":
        load_base2("Challenge FIAP - Bases.xlsx")

