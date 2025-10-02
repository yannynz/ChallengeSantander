#!/usr/bin/env python3
"""Prepara o cache de séries macroeconômicas mais consultadas.

Executar este script periodicamente (ex.: via cron ou agendador do orquestrador)
para reduzir o tempo de resposta da API do BACEN em produção. A política sugerida
é executar diariamente às 05h BRT para as séries SELIC, IPCA e PIB, mantendo o
cache ativo por 12 horas.

Configurações via variáveis de ambiente:
- MACRO_PREWARM_SERIES: lista separada por vírgula (default: "selic,ipca,pib")
- MACRO_PREWARM_MONTHS: alcance histórico em meses (default: 48)
- MACRO_PREWARM_HORIZON: horizonte de projeção (default: 6)

O script reutiliza a camada de cache do `macro.py`, portanto respeita as mesmas
configurações de backend (memória ou banco) e TTL definidos por MACRO_CACHE_*.
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import date, timedelta

from macro import configure_cache_from_env, get_macro_forecast

logging.basicConfig(level=logging.INFO, format="[prewarm] %(message)s")
logger = logging.getLogger(__name__)


def _clean_series(raw: str | None) -> list[str]:
    if not raw:
        return ["selic", "ipca", "pib"]
    series = []
    for item in raw.split(","):
        cleaned = item.strip().lower()
        if cleaned:
            series.append(cleaned)
    return series or ["selic", "ipca", "pib"]


def main() -> int:
    configure_cache_from_env()

    series = _clean_series(os.getenv("MACRO_PREWARM_SERIES"))
    months = max(6, int(os.getenv("MACRO_PREWARM_MONTHS", "48")))
    horizonte = max(1, int(os.getenv("MACRO_PREWARM_HORIZON", "6")))

    from_date = (date.today() - timedelta(days=30 * months)).isoformat()
    logger.info(
        "Preaquecendo cache para %s (from=%s, horizonte=%s)",
        ",".join(series),
        from_date,
        horizonte,
    )

    failures = 0
    for serie in series:
        try:
            result = get_macro_forecast(serie, from_date, horizonte)
        except Exception as exc:  # pragma: no cover - log only
            failures += 1
            logger.warning("Falha ao processar '%s': %s", serie, exc)
            continue

        historico = len(result.get("serie", []))
        forecast = len(result.get("forecast", []))
        fonte = result.get("fonte", "fonte desconhecida")
        logger.info(
            "Serie=%s historico=%d forecast=%d fonte=%s",
            serie,
            historico,
            forecast,
            fonte,
        )

    logger.info("Preaquecimento concluido com %d falha(s).", failures)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
