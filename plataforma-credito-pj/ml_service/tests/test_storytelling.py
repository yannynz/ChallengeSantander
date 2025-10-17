from __future__ import annotations

from sqlalchemy import select

from data_access.impact import load_business_impact
from database import get_engine, session_scope
from explainability import ExplainabilityError, explicar_cliente
from metrics_service import compute_metrics
from simulator import simular
from data_access.schema import simulacao_credito_log


def test_load_business_impact_returns_clients():
    with session_scope() as session:
        payload = load_business_impact(session, limit=2, lookback_days=120)

    assert payload["clientes"], "Deve retornar ao menos um cliente com impacto"
    cliente = payload["clientes"][0]
    assert "limite_depois" in cliente
    assert payload["metadados"]["fonte"].startswith("decisao_credito")


def test_explicar_cliente_gera_shap():
    resultado = explicar_cliente("CLI001")

    assert resultado["fatores"]
    assert abs(sum(resultado["fatores"].values())) > 0
    assert resultado["nivel_risco"] in {"baixo", "medio", "moderado", "alto"}

    try:
        explicar_cliente("CLIENTE_INEXISTENTE")
    except ExplainabilityError:
        assert True


def test_metrics_computation_usa_base_real():
    with session_scope() as session:
        payload = compute_metrics(session, janela_dias=120)

    assert payload["classificacao"]["AUC"] > 0
    assert payload["clusterizacao"]["Silhouette"] >= 0
    assert payload["drift_psi"] >= 0


def test_simulador_grava_log():
    resposta = simular({"renda": 9000, "idade": 32, "historico": 0.8, "conexoes_rede": 10, "usuario": "teste"})
    assert resposta["limite_sugerido"] > 0

    engine = get_engine()
    with engine.connect() as conn:
        rows = conn.execute(select(simulacao_credito_log.c.usuario)).fetchall()
    assert any(row.usuario == "teste" for row in rows)
