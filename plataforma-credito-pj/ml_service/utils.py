from __future__ import annotations

from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

try:  # Permite uso tanto como pacote quanto como script legacy
    from .database import get_engine as _get_engine
    from .database import get_session as _get_session
except ImportError:  # pragma: no cover - fallback para execução direta
    from database import get_engine as _get_engine  # type: ignore
    from database import get_session as _get_session  # type: ignore


def get_engine() -> Engine:
    """Mantido para retrocompatibilidade com scripts existentes."""
    return _get_engine()


def get_session() -> Session:
    """Fornece sessão reaproveitável para scripts legados."""
    return _get_session()
