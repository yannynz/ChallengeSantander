from forecasting import forecast_arima

def test_forecast():
    serie = [100, 110, 120, 130, 140, 150]
    result = forecast_arima(serie, horizonte=3)
    assert len(result) == 3

