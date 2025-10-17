from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from scoring import calcular_score
from forecasting import forecast_arima
from macro import get_macro_forecast, MacroSourceError
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
    try:
        forecast_values = forecast_arima(req.serie, req.horizonte)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"forecast": forecast_values}


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


# ============================
# MACRO DATA
# ============================


@app.get("/ml/v1/macro/{serie}")
def macro(
    serie: str,
    from_date: str | None = Query(default=None, alias="from"),
    horizonte: int | None = None,
):
    try:
        return get_macro_forecast(serie, from_date, horizonte)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MacroSourceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ============================
# BUSINESS IMPACT INSIGHTS
# ============================


class GenericMetadata(BaseModel):
    atualizado_em: str | None = None
    fonte: str | None = None
    amostra: int | None = None
    janela_dias: int | None = None

    model_config = ConfigDict(extra="allow")


class ImpactoCliente(BaseModel):
    empresa_id: str
    nome: str
    segmento: str | None = None
    score: float = Field(ge=0.0, le=1.0)
    limite_antes: float = Field(ge=0.0)
    limite_depois: float = Field(ge=0.0)
    variacao: float
    moeda: str | None = "BRL"
    aprovacao: bool | None = None
    modelo: str | None = None
    versao_modelo: str | None = None
    dt_decisao: str | None = None
    dt_decisao_anterior: str | None = None


class RedeInfluencia(BaseModel):
    cliente: str
    influencia: float = Field(ge=0.0, le=1.0)
    grau: float | None = None
    betweenness: float | None = None
    dt_calc: str | None = None


class ImpactoResponse(BaseModel):
    clientes: list[ImpactoCliente]
    rede_influencia: list[RedeInfluencia]
    resumo: str | None = None
    metadados: GenericMetadata


@app.get("/api/impacto", response_model=ImpactoResponse, tags=["Explainability & Impact"])
def impacto_negocio(
    limit: int = Query(default=5, ge=1, le=20),
    janela: int = Query(default=180, ge=7, le=365),
) -> ImpactoResponse:
    """Consulta impactos reais de limite e influencia na rede."""
    from database import session_scope  # import lazy para testes
    from data_access.impact import load_business_impact

    with session_scope() as session:
        payload = load_business_impact(session, limit=limit, lookback_days=janela)
    return ImpactoResponse.model_validate(payload)


# ============================
# EXPLAINABILITY
# ============================


class ExplainMetadata(GenericMetadata):
    gerado_em: str | None = None
    threshold_sugerido: float | None = None
    versao_modelo: str | None = None
    dt_financeiro: str | None = None


class ExplainResponse(BaseModel):
    id_cliente: str
    score_modelo: float = Field(ge=0.0, le=1.0)
    nivel_risco: str
    fatores: dict[str, float]
    modelo: str | None = None
    observacoes: list[str] | None = None
    metadados: ExplainMetadata


@app.get("/api/explain/{cliente_id}", response_model=ExplainResponse, tags=["Explainability & Impact"])
def explicar_cliente_route(cliente_id: str) -> ExplainResponse:
    """Retorna a decomposicao real das contribuicoes do modelo para o cliente informado."""
    from explainability import ExplainabilityError, explicar_cliente
    from storytelling_utils import avaliar_risco

    try:
        payload = explicar_cliente(cliente_id)
    except ExplainabilityError as exc:
        payload = _explicacao_degenerada(cliente_id, str(exc))
    except Exception as exc:  # pragma: no cover - erro inesperado
        raise HTTPException(status_code=502, detail=f"Falha ao gerar explicabilidade: {exc}") from exc

    if "nivel_risco" not in payload and "score_modelo" in payload:
        payload["nivel_risco"] = avaliar_risco(payload["score_modelo"])
    return ExplainResponse.model_validate(payload)


def _explicacao_degenerada(cliente_id: str, motivo: str) -> dict[str, Any]:
    base = sum(ord(ch) for ch in cliente_id)
    score = max(0.35, min(0.9, (base % 70) / 100))
    fatores = {
        "vl_fatu": round(0.12 + (base % 7) * 0.01, 3),
        "vl_sldo": round(0.08 + (base % 5) * 0.02, 3),
        "idade": round(0.04 + (base % 3) * 0.015, 3),
    }

    return {
        "id_cliente": cliente_id,
        "score_modelo": round(score, 3),
        "nivel_risco": "moderado",
        "fatores": fatores,
        "modelo": "degenerado",
        "observacoes": [
            "Modo degenerado: nao ha dados suficientes para gerar SHAP real.",
            f"Motivo reportado: {motivo}",
        ],
        "metadados": {
            "fonte": "fallback-local",
            "gerado_em": datetime.utcnow().isoformat(),
        },
    }


# ============================
# METRICS & MONITORING
# ============================


class ClassificationMetrics(BaseModel):
    AUC: float
    F1: float
    Recall: float
    Precision: float
    threshold_utilizado: float | None = None
    amostra: int | None = None


class ClusteringMetrics(BaseModel):
    Silhouette: float
    Calinski: float
    clusters: int | None = None
    amostra: int | None = None
    media_faturamento: float | None = None
    media_saldo: float | None = None


class HistoricoAUC(BaseModel):
    periodo: str
    auc: float


class MetricsResponse(BaseModel):
    classificacao: ClassificationMetrics
    clusterizacao: ClusteringMetrics
    historico_auc: list[HistoricoAUC] | None = None
    atualizado_em: str | None = None
    fonte: str | None = None
    janela_dias: int | None = None
    drift_psi: float | None = None


@app.get("/api/metrics", response_model=MetricsResponse, tags=["Explainability & Impact"])
def obter_metricas(refresh: bool = Query(default=False)) -> MetricsResponse:
    """Retorna metricas de validacao calculadas a partir do banco real."""
    from database import session_scope
    from metrics_service import compute_metrics, load_metrics_from_disk, persist_metrics

    if refresh:
        with session_scope() as session:
            metrics = compute_metrics(session)
        persist_metrics(metrics)
        return MetricsResponse.model_validate(metrics)

    try:
        metrics = load_metrics_from_disk()
    except FileNotFoundError:
        with session_scope() as session:
            metrics = compute_metrics(session)
        persist_metrics(metrics)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Falha ao carregar metricas: {exc}") from exc
    return MetricsResponse.model_validate(metrics)


# ============================
# SIMULADOR DE CREDITO
# ============================


class SimuladorRequest(BaseModel):
    renda: float = Field(gt=0, description="Renda mensal declarada")
    idade: int = Field(gt=17, lt=100, description="Idade em anos")
    historico: float = Field(ge=0.0, le=1.0, description="Indice de historico de credito normalizado")
    conexoes_rede: int = Field(ge=0, le=200, description="Numero de conexoes relevantes na rede")
    usuario: str | None = Field(default=None, description="Identificador do operador/cliente")


class SimuladorResponse(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    risco: str
    modelo: str | None = None
    influencia_rede: float = Field(ge=0.0, le=1.0)
    limite_sugerido: float
    mensagem: str
    metadados: GenericMetadata | None = None


@app.post("/api/simulador", response_model=SimuladorResponse, tags=["Explainability & Impact"])
def simular_credito(payload: SimuladorRequest) -> SimuladorResponse:
    from simulator import simular

    try:
        resultado = simular(payload.model_dump())
    except Exception as exc:  # pragma: no cover - erro operacional
        raise HTTPException(status_code=502, detail=f"Falha ao simular credito: {exc}") from exc
    return SimuladorResponse.model_validate(resultado)
