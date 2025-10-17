from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

import numpy as np
from sqlalchemy import DateTime, cast, func, select
from sqlalchemy.orm import Session
from sklearn.cluster import KMeans
from sklearn.metrics import (
    calinski_harabasz_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    silhouette_score,
)

from .data_access.schema import (
    decisao_credito,
    empresa_financeiro,
    score_risco,
)
from .storytelling_utils import media

METRICS_PATH = Path(__file__).parent / "metrics.json"


def _decimal(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _population_stability_index(
    baseline: np.ndarray,
    atual: np.ndarray,
    bins: int = 10,
) -> float:
    if len(baseline) == 0 or len(atual) == 0:
        return 0.0
    bin_edges = np.linspace(0.0, 1.0, bins + 1)
    base_counts, _ = np.histogram(baseline, bins=bin_edges)
    atual_counts, _ = np.histogram(atual, bins=bin_edges)

    base_pct = np.where(base_counts == 0, 1e-6, base_counts / baseline.size)
    atual_pct = np.where(atual_counts == 0, 1e-6, atual_counts / atual.size)
    psi = np.sum((atual_pct - base_pct) * np.log(atual_pct / base_pct))
    return float(round(psi, 4))


def compute_metrics(session: Session, janela_dias: int = 180) -> dict[str, Any]:
    cutoff = datetime.utcnow() - timedelta(days=janela_dias)

    decisoes = session.execute(
        select(
            decisao_credito.c.score,
            decisao_credito.c.aprovacao,
            decisao_credito.c.dt_decisao,
        ).where(
            cast(decisao_credito.c.dt_decisao, DateTime)
            >= cast(cutoff, DateTime)
        )
    ).all()

    if not decisoes:
        raise RuntimeError("Nenhuma decisao de credito encontrada na janela configurada.")

    scores = np.array([_decimal(row.score) for row in decisoes], dtype=float)
    labels = np.array([1 if row.aprovacao else 0 for row in decisoes], dtype=int)

    threshold_row = session.execute(
        select(func.avg(score_risco.c.threshold)).where(score_risco.c.threshold.is_not(None))
    ).scalar()
    threshold = float(threshold_row) if threshold_row is not None else float(np.median(scores))

    preds = (scores >= threshold).astype(int)

    classificacao = {
        "AUC": round(float(roc_auc_score(labels, scores)), 3),
        "F1": round(float(f1_score(labels, preds)), 3),
        "Recall": round(float(recall_score(labels, preds)), 3),
        "Precision": round(float(precision_score(labels, preds)), 3),
        "threshold_utilizado": round(threshold, 4),
        "amostra": len(decisoes),
    }

    historico_auc = _compute_auc_history(decisoes)

    drift = _population_stability_index(
        baseline=scores[: len(scores) // 2] if len(scores) > 2 else scores,
        atual=scores[len(scores) // 2 :] if len(scores) > 2 else scores,
    )

    clusterizacao = _compute_cluster_metrics(session, cutoff)

    payload = {
        "classificacao": classificacao,
        "clusterizacao": clusterizacao,
        "historico_auc": historico_auc,
        "atualizado_em": datetime.utcnow().isoformat(),
        "fonte": "decisao_credito|score_risco|empresa_financeiro",
        "janela_dias": janela_dias,
        "drift_psi": drift,
    }
    return payload


def _compute_auc_history(decisoes: list) -> list[dict[str, Any]]:
    bucket: dict[str, list[tuple[float, int]]] = defaultdict(list)
    for row in decisoes:
        data = row.dt_decisao or datetime.utcnow()
        periodo = data.strftime("%Y-%m")
        bucket[periodo].append((_decimal(row.score), 1 if row.aprovacao else 0))

    historico: list[dict[str, Any]] = []
    for periodo in sorted(bucket.keys()):
        valores = bucket[periodo]
        scores = np.array([item[0] for item in valores], dtype=float)
        labels = np.array([item[1] for item in valores], dtype=int)
        if len(np.unique(labels)) < 2:
            continue
        auc = roc_auc_score(labels, scores)
        historico.append({"periodo": periodo, "auc": round(float(auc), 3)})
    return historico[-6:]


def _compute_cluster_metrics(session: Session, cutoff: datetime) -> dict[str, Any]:
    amostras = session.execute(
        select(
            empresa_financeiro.c.vl_fatu,
            empresa_financeiro.c.vl_sldo,
        ).where(
            empresa_financeiro.c.dt_ref >= cutoff.date()
        )
    ).all()

    if len(amostras) < 4:
        return {"Silhouette": 0.0, "Calinski": 0.0, "amostra": len(amostras)}

    dados = np.array(
        [[_decimal(row.vl_fatu), _decimal(row.vl_sldo)] for row in amostras],
        dtype=float,
    )

    n_clusters = min(4, max(2, len(amostras) // 5))
    modelo = KMeans(n_clusters=n_clusters, n_init=25, random_state=42)
    labels = modelo.fit_predict(dados)

    silhouette = float(silhouette_score(dados, labels))
    calinski = float(calinski_harabasz_score(dados, labels))

    return {
        "Silhouette": round(silhouette, 3),
        "Calinski": round(calinski, 3),
        "clusters": n_clusters,
        "amostra": len(amostras),
        "media_faturamento": round(media(dados[:, 0]), 2),
        "media_saldo": round(media(dados[:, 1]), 2),
    }


def load_metrics_from_disk() -> dict[str, Any]:
    if not METRICS_PATH.exists():
        raise FileNotFoundError("metrics.json nao encontrado. Execute validation.py antes.")
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


def persist_metrics(metrics: dict[str, Any]) -> None:
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
