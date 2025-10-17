from __future__ import annotations

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_impacto_endpoint_returns_payload_with_metadata():
    response = client.get("/api/impacto?limit=2")
    assert response.status_code == 200
    payload = response.json()
    assert "clientes" in payload and len(payload["clientes"]) <= 2
    assert payload["metadados"]["fonte"]


def test_explain_endpoint_known_client():
    response = client.get("/api/explain/CLI001")
    assert response.status_code == 200
    payload = response.json()
    assert payload["id_cliente"] == "CLI001"
    assert payload["fatores"]


def test_explain_endpoint_unknown_client_fallback():
    response = client.get("/api/explain/CLIENTE_NO_DATA")
    assert response.status_code == 200
    payload = response.json()
    assert payload["modelo"] == "degenerado"
    assert payload["observacoes"]


def test_metrics_endpoint_supports_refresh_flag():
    response = client.get("/api/metrics?refresh=true")
    assert response.status_code == 200
    payload = response.json()
    assert payload["classificacao"]["AUC"] > 0
    assert payload["clusterizacao"]["Silhouette"] >= 0


def test_simulador_endpoint_returns_score_and_risk():
    request_body = {
        "renda": 8000,
        "idade": 35,
        "historico": 0.9,
        "conexoes_rede": 12,
        "usuario": "spec",
    }
    response = client.post("/api/simulador", json=request_body)
    assert response.status_code == 200
    payload = response.json()
    assert 0.0 <= payload["score"] <= 1.0
    assert payload["risco"] in {"baixo", "medio", "moderado", "alto"}
    assert payload["metadados"]
