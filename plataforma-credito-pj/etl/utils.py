import os
import pandas as pd
from sqlalchemy import MetaData, Table, create_engine, text
from sqlalchemy.dialects.postgresql import insert
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


def _sanitize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce NaN values to None for SQLAlchemy compatibility."""
    return df.where(pd.notnull(df), None)


def upsert_dataframe(engine, df: pd.DataFrame, table_name: str, conflict_columns: list[str]) -> None:
    """Perform an upsert (insert/update) for a DataFrame into a PostgreSQL table."""
    if df.empty:
        return

    sanitized = _sanitize_dataframe(df)

    metadata = MetaData()
    table = Table(table_name, metadata, autoload_with=engine)

    table_columns = {column.name for column in table.columns}
    update_columns = [
        column for column in sanitized.columns
        if column in table_columns and column not in conflict_columns
    ]

    if engine.dialect.name != "postgresql":
        sanitized = sanitized.drop_duplicates(subset=conflict_columns, keep="last")
        key_rows = sanitized[conflict_columns].to_dict(orient="records")

        with engine.begin() as connection:
            for row in key_rows:
                where_clause = " AND ".join(f"{col} = :{col}" for col in conflict_columns)
                connection.execute(
                    text(f"DELETE FROM {table_name} WHERE {where_clause}"),
                    row,
                )

        sanitized.to_sql(table_name, engine, if_exists="append", index=False)
        return

    insert_stmt = insert(table)

    if update_columns:
        upsert_stmt = insert_stmt.on_conflict_do_update(
            index_elements=conflict_columns,
            set_={column: insert_stmt.excluded[column] for column in update_columns},
        )
    else:
        upsert_stmt = insert_stmt.on_conflict_do_nothing(index_elements=conflict_columns)

    payload = sanitized.to_dict(orient="records")

    with engine.begin() as connection:
        connection.execute(upsert_stmt, payload)
