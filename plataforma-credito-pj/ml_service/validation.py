"""
Executa pipeline de validação com dados reais e atualiza metrics.json.

O script é idempotente e pode ser utilizado no CI/CD ou em cron jobs.
"""

import logging
import sys
from contextlib import suppress
from pathlib import Path

from sqlalchemy.exc import SQLAlchemyError

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parent))
    from database import session_scope  # type: ignore
    from metrics_service import METRICS_PATH, compute_metrics, persist_metrics  # type: ignore
else:
    from .database import session_scope
    from .metrics_service import METRICS_PATH, compute_metrics, persist_metrics

logger = logging.getLogger("validation")


def main() -> None:
    with session_scope() as session:
        try:
            metrics = compute_metrics(session)
        except SQLAlchemyError as exc:
            logger.exception("Falha ao consultar banco para validacao")
            raise SystemExit(2) from exc

        persist_metrics(metrics)
        logger.info("Metrics atualizadas em %s", METRICS_PATH)


if __name__ == "__main__":
    with suppress(KeyboardInterrupt):
        main()
