import pandas as pd
import statsmodels.api as sm

def forecast_arima(serie: list[float], horizonte: int):
    serie = pd.Series(serie).dropna()

    if len(serie) < 5:
        raise ValueError("Série temporal muito curta para ARIMA.")

    model = sm.tsa.ARIMA(serie, order=(1, 1, 1))
    fitted = model.fit()
    forecast = fitted.forecast(steps=horizonte)
    return forecast.tolist()

