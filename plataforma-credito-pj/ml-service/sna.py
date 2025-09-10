import pandas as pd
import networkx as nx
from sqlalchemy import text
from utils import get_engine
from datetime import date

def calcular_centralidades(dt_ref: str = None):
    """
    Calcula métricas de SNA (grau, betweenness, eigenvector, clusters)
    para as transações do banco de dados.
    Salva resultados em centralidade_snapshot.
    """

    engine = get_engine()

    # Selecionar transações
    query = "SELECT id_pgto, id_rcbe, vl, dt_ref FROM transacao"
    if dt_ref:
        query += " WHERE dt_ref = :dt_ref"
        df = pd.read_sql(text(query), engine, params={"dt_ref": dt_ref})
    else:
        df = pd.read_sql(query, engine)

    if df.empty:
        print("⚠️ Nenhuma transação encontrada")
        return

    # Criar grafo direcionado e ponderado
    G = nx.DiGraph()
    for _, row in df.iterrows():
        G.add_edge(row["id_pgto"], row["id_rcbe"], weight=row["vl"])

    # Métricas de centralidade
    grau = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G, weight="weight", normalized=True)
    try:
        eigenvector = nx.eigenvector_centrality(G, weight="weight", max_iter=500)
    except nx.NetworkXError:
        eigenvector = {n: 0 for n in G.nodes}

    # Clusters (componentes fortemente conectados)
    clusters = {node: cid for cid, comp in enumerate(nx.strongly_connected_components(G)) for node in comp}

    # Data do cálculo
    dt_calc = date.today()

    # Preparar DataFrame
    records = []
    for empresa_id in G.nodes:
        records.append({
            "empresa_id": empresa_id,
            "grau": grau.get(empresa_id, 0),
            "betweenness": betweenness.get(empresa_id, 0),
            "eigenvector": eigenvector.get(empresa_id, 0),
            "cluster_id": clusters.get(empresa_id, -1),
            "dt_calc": dt_calc
        })

    df_out = pd.DataFrame(records)

    # Inserir no banco
    df_out.to_sql("centralidade_snapshot", engine, if_exists="append", index=False)

    print(f"✅ Centralidades calculadas e salvas ({len(df_out)} empresas).")

if __name__ == "__main__":
    calcular_centralidades()

