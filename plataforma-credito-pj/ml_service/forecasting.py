from __future__ import annotations

from typing import Iterable, List

import numpy as np
import pandas as pd
import statsmodels.api as sm


def forecast_arima(serie: Iterable[float], horizonte: int) -> List[float]:
    """Executa previsão ARIMA com degradação elegante para séries curtas.

    O modelo padrão (ARIMA(1,1,1)) requer ao menos 5 observações úteis para
    estimar os parâmetros com estabilidade. Quando a série é menor que isso, ou
    quando a estimação falha, recorremos a uma extrapolação linear simples para
    manter o serviço operante e previsível.
    """

    serie_pd = pd.Series(list(serie), dtype="float64").dropna()

    if horizonte is None or int(horizonte) <= 0:
        raise ValueError("Horizonte deve ser um inteiro positivo.")

    horizonte = int(horizonte)

    if serie_pd.empty:
        raise ValueError("Série temporal vazia.")

    if len(serie_pd) < 5:
        return _linear_fallback(serie_pd, horizonte)

    try:
        model = sm.tsa.ARIMA(serie_pd, order=(1, 1, 1))
        fitted = model.fit()
        forecast = fitted.forecast(steps=horizonte)
        return [float(value) for value in forecast.to_list()]
    except Exception:
        # Para qualquer falha na estimação (ex.: singularidade, não convergência),
        # recorre ao fallback determinístico.
        return _linear_fallback(serie_pd, horizonte)


def _linear_fallback(serie_pd: pd.Series, horizonte: int) -> List[float]:
    """Calcula uma extrapolação linear simples para séries curtas.

    - Com apenas um ponto, repete o valor presente.
    - Com dois ou mais pontos, ajusta uma reta y = ax + b via mínimos quadrados
      e projeta os próximos `horizonte` passos.
    """

    last_value = float(serie_pd.iloc[-1])

    if len(serie_pd) == 1:
        return [last_value] * horizonte

    x = np.arange(len(serie_pd), dtype=float)
    y = serie_pd.to_numpy(dtype=float)

    try:
        slope, intercept = np.polyfit(x, y, 1)
    except (TypeError, np.linalg.LinAlgError):
        return [last_value] * horizonte

    future_index = np.arange(len(serie_pd), len(serie_pd) + horizonte, dtype=float)
    forecast = intercept + slope * future_index
    return [float(value) for value in forecast]
