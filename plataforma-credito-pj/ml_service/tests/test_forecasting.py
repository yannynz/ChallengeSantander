import pytest

from forecasting import forecast_arima


def test_forecast_with_sufficient_series():
    serie = [100, 110, 120, 130, 140, 150]
    result = forecast_arima(serie, horizonte=3)

    assert len(result) == 3
    # ARIMA deve produzir valores contínuos próximos ao último nível.
    assert all(isinstance(value, float) for value in result)


def test_forecast_short_series_uses_linear_fallback():
    serie = [100, 110, 120, 130]
    result = forecast_arima(serie, horizonte=3)

    assert len(result) == 3
    assert result[0] == pytest.approx(140.0, rel=1e-3)
    assert result[1] == pytest.approx(150.0, rel=1e-3)
    assert result[2] == pytest.approx(160.0, rel=1e-3)


def test_forecast_with_single_value_repeats_last():
    serie = [123.45]
    result = forecast_arima(serie, horizonte=2)

    assert result == pytest.approx([123.45, 123.45])


def test_forecast_invalid_horizon_raises_value_error():
    with pytest.raises(ValueError):
        forecast_arima([1.0, 2.0, 3.0], horizonte=0)
