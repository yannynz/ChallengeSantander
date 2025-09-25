from fastapi import FastAPI
from pydantic import BaseModel
from scoring import calcular_score
from sna import calcular_centralidades
from forecasting import forecast_arima
import networkx as nx

app = FastAPI(title="ML-Service", version="1.0.0")

# ============================
# SCORE RISCO
# ============================

class ScoreRequest(BaseModel):
    features: dict = {
        "idade": 5,
        "vl_fatu": 100000,
        "vl_sldo": 20000
    }
    modelo: str = "rf"

    class Config:
        schema_extra = {
            "example": {
                "features": {"idade": 5, "vl_fatu": 100000, "vl_sldo": 20000},
                "modelo": "rf"
            }
        }

@app.post("/ml/v1/score")
def score_risco(req: ScoreRequest):
    score, modelo_usado = calcular_score(req.features, req.modelo)
    return {"score": score, "modelo": modelo_usado, "versao": "1.0.0"}


# ============================
# FORECAST (ARIMA)
# ============================

class ForecastRequest(BaseModel):
    serie: list[float]
    horizonte: int

    class Config:
        schema_extra = {
            "example": {
                "serie": [100, 110, 120, 130, 140],
                "horizonte": 3
            }
        }

@app.post("/ml/v1/forecast/arima")
def forecast(req: ForecastRequest):
    return {"forecast": forecast_arima(req.serie, req.horizonte)}


# ============================
# SNA (Centralidades)
# ============================

class Edge(BaseModel):
    source: str
    target: str
    weight: float

class SNARequest(BaseModel):
    edges: list[Edge]

@app.post("/ml/v1/sna/centralidades")
def sna(req: SNARequest):
    G = nx.DiGraph()
    for edge in req.edges:
        G.add_edge(edge.source, edge.target, weight=edge.weight)
    grau = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G, weight="weight")
    try:
        eigenvector = nx.eigenvector_centrality(G, weight="weight", max_iter=500)
    except:
        eigenvector = {n: 0 for n in G.nodes}
    clusters = {node: cid for cid, comp in enumerate(nx.strongly_connected_components(G)) for node in comp}
    return {"grau": grau, "betweenness": betweenness, "eigenvector": eigenvector, "clusters": clusters}

