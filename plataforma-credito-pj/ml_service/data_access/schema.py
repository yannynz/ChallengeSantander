from __future__ import annotations

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    Integer,
    MetaData,
    Numeric,
    String,
    Table,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB

metadata = MetaData()

empresa = Table(
    "empresa",
    metadata,
    Column("id", String, primary_key=True),
    Column("cnpj", String(14)),
    Column("ds_cnae", Text),
    Column("dt_abrt", Date),
)

empresa_financeiro = Table(
    "empresa_financeiro",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("empresa_id", String, nullable=False),
    Column("dt_ref", Date, nullable=False),
    Column("vl_fatu", Numeric),
    Column("vl_sldo", Numeric),
)

transacao = Table(
    "transacao",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("id_pgto", String),
    Column("id_rcbe", String),
    Column("vl", Numeric),
    Column("ds_tran", Text),
    Column("dt_ref", Date, nullable=False),
)

centralidade_snapshot = Table(
    "centralidade_snapshot",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("dt_calc", Date, nullable=False),
    Column("empresa_id", String, nullable=False),
    Column("grau", Numeric),
    Column("betweenness", Numeric),
    Column("eigenvector", Numeric),
    Column("cluster_id", Integer),
)

score_risco = Table(
    "score_risco",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("empresa_id", String, nullable=False),
    Column("dt_calc", DateTime),
    Column("modelo", String),
    Column("score", Numeric),
    Column("auc_valid", Numeric),
    Column("threshold", Numeric),
    Column("versao_modelo", String),
)

decisao_credito = Table(
    "decisao_credito",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("empresa_id", String, nullable=False),
    Column("dt_decisao", DateTime),
    Column("score", Numeric),
    Column("aprovacao", Boolean),
    Column("limite", Numeric),
    Column("moeda", String),
    Column("motivo", Text),
)

explainability_snapshot = Table(
    "explainability_snapshot",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("empresa_id", String, nullable=False),
    Column("modelo", String, nullable=False),
    Column("executado_em", DateTime),
    Column("score", Numeric),
    Column("nivel_risco", String),
    Column(
        "top_features",
        JSONB().with_variant(Text, "sqlite"),
        nullable=False,
    ),
    Column("base_value", Float),
    Column("fonte", String, nullable=False, default="ml_service"),
)

simulacao_credito_log = Table(
    "simulacao_credito_log",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("registrado_em", DateTime, nullable=False),
    Column("usuario", String, nullable=False),
    Column("payload", JSONB().with_variant(Text, "sqlite"), nullable=False),
    Column("score", Float),
    Column("risco", String),
    Column("limite_sugerido", Numeric),
)
