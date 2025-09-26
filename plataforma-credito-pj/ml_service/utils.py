import os
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool


def get_engine():
    url = os.getenv("DATABASE_URL")
    if url:
        if url.startswith("sqlite"):
            return create_engine(
                url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        return create_engine(url)

    db_user = os.getenv("DB_USER", "postgres")
    db_pass = os.getenv("DB_PASS", "postgres")
    db_host = os.getenv("DB_HOST", "postgres")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "credito_pj")
    return create_engine(f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}")
