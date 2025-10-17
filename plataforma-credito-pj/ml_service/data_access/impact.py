from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Iterable

from sqlalchemy import DateTime, cast, desc, func, select
from sqlalchemy.orm import Session

from .schema import (
    centralidade_snapshot,
    decisao_credito,
    empresa,
    score_risco,
)


def _decimal_to_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _safe_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float, Decimal)):
        return bool(value)
    return None


def load_business_impact(
    session: Session,
    limit: int = 5,
    lookback_days: int = 180,
) -> dict[str, Any]:
    """
    Coleta limites antes/depois, scores e influencia para storytelling.

    Retorna payload estruturado para o endpoint /api/impacto.
    """
    cutoff = datetime.utcnow() - timedelta(days=lookback_days)

    ranked_decisions = (
        select(
            decisao_credito.c.empresa_id,
            decisao_credito.c.dt_decisao,
            decisao_credito.c.limite,
            decisao_credito.c.score,
            decisao_credito.c.aprovacao,
            decisao_credito.c.moeda,
            func.row_number()
            .over(
                partition_by=decisao_credito.c.empresa_id,
                order_by=decisao_credito.c.dt_decisao.desc(),
            )
            .label("rnk"),
            func.lead(decisao_credito.c.limite)
            .over(
                partition_by=decisao_credito.c.empresa_id,
                order_by=decisao_credito.c.dt_decisao.desc(),
            )
            .label("limite_anterior"),
            func.lead(decisao_credito.c.dt_decisao)
            .over(
                partition_by=decisao_credito.c.empresa_id,
                order_by=decisao_credito.c.dt_decisao.desc(),
            )
            .label("dt_anterior"),
        )
        .where(
            cast(decisao_credito.c.dt_decisao, DateTime)
            >= cast(cutoff, DateTime)
        )
        .subquery()
    )

    latest_scores = (
        select(
            score_risco.c.empresa_id,
            score_risco.c.score.label("score"),
            score_risco.c.modelo.label("modelo"),
            score_risco.c.versao_modelo.label("versao_modelo"),
            score_risco.c.threshold.label("threshold"),
            func.row_number()
            .over(
                partition_by=score_risco.c.empresa_id,
                order_by=score_risco.c.dt_calc.desc(),
            )
            .label("rnk"),
        )
        .subquery()
    )

    latest_centralidade = (
        select(
            centralidade_snapshot.c.empresa_id,
            centralidade_snapshot.c.grau,
            centralidade_snapshot.c.betweenness,
            centralidade_snapshot.c.eigenvector,
            centralidade_snapshot.c.cluster_id,
            centralidade_snapshot.c.dt_calc,
            func.row_number()
            .over(
                partition_by=centralidade_snapshot.c.empresa_id,
                order_by=centralidade_snapshot.c.dt_calc.desc(),
            )
            .label("rnk"),
        )
        .subquery()
    )

    latest_decisoes = select(ranked_decisions).where(ranked_decisions.c.rnk == 1).subquery()

    stmt = (
        select(
            empresa.c.id.label("empresa_id"),
            empresa.c.ds_cnae.label("segmento"),
            latest_decisoes.c.dt_decisao.label("dt_decisao"),
            latest_decisoes.c.dt_anterior.label("dt_decisao_anterior"),
            latest_decisoes.c.moeda,
            latest_decisoes.c.aprovacao,
            latest_decisoes.c.score.label("score_decisao"),
            func.coalesce(latest_decisoes.c.limite, 0).label("limite_depois"),
            func.coalesce(latest_decisoes.c.limite_anterior, 0).label("limite_antes"),
            func.coalesce(latest_scores.c.score, latest_decisoes.c.score, 0).label("score"),
            latest_scores.c.modelo,
            latest_scores.c.versao_modelo,
            latest_centralidade.c.grau,
            latest_centralidade.c.betweenness,
            latest_centralidade.c.eigenvector,
        )
        .select_from(
            empresa.join(
                latest_decisoes,
                empresa.c.id == latest_decisoes.c.empresa_id,
            )
            .outerjoin(
                latest_scores,
                (latest_scores.c.empresa_id == empresa.c.id)
                & (latest_scores.c.rnk == 1),
            )
            .outerjoin(
                latest_centralidade,
                (latest_centralidade.c.empresa_id == empresa.c.id)
                & (latest_centralidade.c.rnk == 1),
            )
        )
        .order_by(
            desc(
                func.coalesce(
                    latest_decisoes.c.limite, 0
                )
                - func.coalesce(
                    latest_decisoes.c.limite_anterior,
                    latest_decisoes.c.limite,
                    0,
                )
            )
        )
        .limit(limit)
    )

    rows = session.execute(stmt).all()

    clientes: list[dict[str, Any]] = []
    variacoes: list[float] = []

    for row in rows:
        data = row._mapping
        limite_depois = _decimal_to_float(data["limite_depois"])
        limite_antes = _decimal_to_float(data["limite_antes"])
        variacao = round(limite_depois - limite_antes, 2)
        variacoes.append(variacao)
        clientes.append(
            {
                "empresa_id": data["empresa_id"],
                "nome": data["empresa_id"],
                "segmento": data["segmento"],
                "score": round(_decimal_to_float(data["score"]), 3),
                "limite_antes": round(limite_antes, 2),
                "limite_depois": round(limite_depois, 2),
                "variacao": variacao,
                "moeda": data["moeda"] or "BRL",
                "aprovacao": _safe_bool(data["aprovacao"]),
                "modelo": data["modelo"] or "desconhecido",
                "versao_modelo": data["versao_modelo"],
                "dt_decisao": data["dt_decisao"].isoformat() if data["dt_decisao"] else None,
                "dt_decisao_anterior": data["dt_decisao_anterior"].isoformat()
                if data["dt_decisao_anterior"]
                else None,
            }
        )

    redes = _load_influencia(session, cutoff=cutoff, limit=max(limit, 5))

    resumo = _build_resumo(clientes, variacoes)

    payload: dict[str, Any] = {
        "clientes": clientes,
        "rede_influencia": redes,
        "resumo": resumo,
        "metadados": {
            "atualizado_em": datetime.utcnow().isoformat(),
            "fonte": "decisao_credito|score_risco|centralidade_snapshot",
            "amostra": len(clientes),
            "janela_dias": lookback_days,
        },
    }
    return payload


def _load_influencia(
    session: Session,
    *,
    cutoff: datetime,
    limit: int,
) -> list[dict[str, Any]]:
    ranked_centralidade = (
        select(
            centralidade_snapshot.c.empresa_id,
            centralidade_snapshot.c.grau,
            centralidade_snapshot.c.betweenness,
            centralidade_snapshot.c.eigenvector,
            centralidade_snapshot.c.dt_calc,
            func.row_number()
            .over(
                partition_by=centralidade_snapshot.c.empresa_id,
                order_by=centralidade_snapshot.c.dt_calc.desc(),
            )
            .label("rnk"),
        )
        .where(
            cast(centralidade_snapshot.c.dt_calc, DateTime)
            >= cast(cutoff, DateTime)
        )
        .subquery()
    )

    stmt = (
        select(
            ranked_centralidade.c.empresa_id,
            ranked_centralidade.c.grau,
            ranked_centralidade.c.betweenness,
            ranked_centralidade.c.eigenvector,
            ranked_centralidade.c.dt_calc,
        )
        .where(ranked_centralidade.c.rnk == 1)
        .order_by(desc(ranked_centralidade.c.eigenvector))
        .limit(limit)
    )
    rows = session.execute(stmt).all()

    return [
        {
            "cliente": row.empresa_id,
            "influencia": round(_decimal_to_float(row.eigenvector), 5),
            "grau": round(_decimal_to_float(row.grau), 5),
            "betweenness": round(_decimal_to_float(row.betweenness), 5),
            "dt_calc": row.dt_calc.isoformat() if row.dt_calc else None,
        }
        for row in rows
    ]


def _build_resumo(clientes: Iterable[dict[str, Any]], variacoes: list[float]) -> str | None:
    clientes = list(clientes)
    if not clientes:
        return None
    media = sum(variacoes) / len(variacoes) if variacoes else 0.0
    melhor = max(clientes, key=lambda item: item.get("variacao", 0.0))
    return (
        f"{len(clientes)} clientes monitorados tiveram aumento medio de limite "
        f"de R$ {media:,.2f}. Destaque para {melhor['nome']} com ganho de "
        f"R$ {melhor.get('variacao', 0.0):,.2f} apos ultima decisao."
    )
