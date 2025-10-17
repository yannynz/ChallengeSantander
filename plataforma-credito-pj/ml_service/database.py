from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

_ENGINE: Engine | None = None
_SESSION_FACTORY: sessionmaker | None = None


def _build_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url

    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASS", "postgres")
    host = os.getenv("DB_HOST", "postgres")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "credito_pj")
    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


def get_engine() -> Engine:
    """Retorna instancia compartilhada do Engine SQLAlchemy com health-check."""
    global _ENGINE
    if _ENGINE is None:
        url = _build_database_url()
        connect_args: dict[str, object] = {}
        engine_kwargs: dict[str, object] = {
            "future": True,
            "pool_pre_ping": True,
        }

        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
            engine_kwargs["poolclass"] = StaticPool

        _ENGINE = create_engine(url, connect_args=connect_args, **engine_kwargs)
    return _ENGINE


def get_session_factory() -> sessionmaker:
    """Retorna session factory (lazy) com autocommit desativado."""
    global _SESSION_FACTORY
    if _SESSION_FACTORY is None:
        _SESSION_FACTORY = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            future=True,
        )
    return _SESSION_FACTORY


def get_session() -> Session:
    """Retorna uma sessão desacoplada (caller deve fechar)."""
    return get_session_factory()()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """
    Context manager simples para operações de leitura/escrita.

    O commit só é disparado em caso de ausência de exceções.
    """
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:  # pragma: no cover - rollback defensivo
        session.rollback()
        raise
    finally:
        session.close()
