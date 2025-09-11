from sna import calcular_centralidades
import pandas as pd
from utils import get_engine

def test_sna_runs():
    engine = get_engine()
    df = pd.DataFrame([
        {"id_pgto": "A", "id_rcbe": "B", "vl": 100, "dt_ref": "2023-01-01"},
        {"id_pgto": "B", "id_rcbe": "C", "vl": 200, "dt_ref": "2023-01-01"},
    ])
    df.to_sql("transacao", engine, if_exists="append", index=False)
    calcular_centralidades()
    # Se rodou sem erro -> passou
    assert True

