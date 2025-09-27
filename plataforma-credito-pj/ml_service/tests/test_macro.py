import json
import pytest

import macro
from macro import MacroSourceError, get_macro_forecast


@pytest.fixture(autouse=True)
def _clear_cache():
    macro.configure_cache_from_env()
    macro.clear_cache()
    yield
    macro.clear_cache()
    macro.configure_cache_from_env()


class _DummyResponse:
    def __init__(self, payload):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps(self._payload).encode("utf-8")


def test_get_macro_forecast_success(monkeypatch):
    payload = [
        {"data": "01/01/2024", "valor": "10,50"},
        {"data": "01/02/2024", "valor": "10,75"},
        {"data": "01/03/2024", "valor": "10,90"},
        {"data": "01/04/2024", "valor": "11,00"},
        {"data": "01/05/2024", "valor": "11,25"},
    ]

    monkeypatch.setattr(macro.request, "urlopen", lambda *args, **kwargs: _DummyResponse(payload))

    result = get_macro_forecast("selic", "2024-01", 2)

    assert result["serie"] == pytest.approx([10.5, 10.75, 10.9, 11.0, 11.25])
    assert len(result["forecast"]) == 2
    assert result["historicoTimestamps"][0] == "2024-01-01"
    assert result["forecastTimestamps"]
    assert "SGS" in result["fonte"]
    assert result["serieId"] == "selic"
    assert "SELIC" in result["descricao"].upper()
    assert result["ultimaAtualizacao"] == "2024-05-01"


def test_get_macro_forecast_unknown_series():
    with pytest.raises(ValueError):
        get_macro_forecast("desconhecida", "2024-01", 1)


def test_get_macro_forecast_source_error(monkeypatch):
    def _raise(*args, **kwargs):  # pragma: no cover - branch instrumentation
        raise macro.error.URLError("boom")

    monkeypatch.setattr(macro.request, "urlopen", _raise)

    with pytest.raises(MacroSourceError):
        get_macro_forecast("selic", "2024-01", 1)


def test_get_macro_forecast_uses_cache(monkeypatch):
    payload = [
        {"data": "01/01/2024", "valor": "10,00"},
        {"data": "01/02/2024", "valor": "10,10"},
        {"data": "01/03/2024", "valor": "10,20"},
        {"data": "01/04/2024", "valor": "10,30"},
        {"data": "01/05/2024", "valor": "10,40"},
    ]

    call_count = {"value": 0}

    def _fake_urlopen(*args, **kwargs):
        call_count["value"] += 1
        return _DummyResponse(payload)

    monkeypatch.setattr(macro.request, "urlopen", _fake_urlopen)

    first = get_macro_forecast("selic", "2024-01", 1)
    second = get_macro_forecast("selic", "2024-01", 1)

    assert call_count["value"] == 1
    assert first == second


def test_get_macro_forecast_persistent_cache(tmp_path, monkeypatch):
    db_path = tmp_path / "macro_cache.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("MACRO_CACHE_BACKEND", "database")
    monkeypatch.setenv("MACRO_CACHE_MINUTES", "60")
    macro.configure_cache_from_env()
    macro.clear_cache()

    payload = [
        {"data": "01/01/2024", "valor": "9,90"},
        {"data": "01/02/2024", "valor": "10,00"},
        {"data": "01/03/2024", "valor": "10,10"},
    ]

    call_count = {"value": 0}

    def _fake_urlopen(*args, **kwargs):
        call_count["value"] += 1
        return _DummyResponse(payload)

    monkeypatch.setattr(macro.request, "urlopen", _fake_urlopen)

    first = get_macro_forecast("selic", "2024-01", 2)
    macro.clear_memory_cache()
    second = get_macro_forecast("selic", "2024-01", 2)

    assert call_count["value"] == 1
    assert first == second
