from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal
from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd
import shap
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from .database import session_scope
from .data_access.schema import (
    empresa,
    empresa_financeiro,
    explainability_snapshot,
    score_risco,
)
from .scoring import FEATURE_ORDER, calcular_score, get_model
from .storytelling_utils import avaliar_risco


class ExplainabilityError(Exception):
    """Erro de negocio ao gerar explicabilidade."""


def _years_since(value: date | datetime | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, datetime):
        base = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    else:
        base = datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    delta = now - base
    return max(delta.days / 365.25, 0.0)


def _decimal(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


@lru_cache(maxsize=4)
def _get_explainer(model_label: str):
    model, _ = get_model(model_label)
    return shap.TreeExplainer(model)


def _build_feature_frame(features: dict[str, float]) -> pd.DataFrame:
    ordered = {column: float(features.get(column, 0.0) or 0.0) for column in FEATURE_ORDER}
    return pd.DataFrame([ordered], columns=FEATURE_ORDER)


def _extract_contributions(values: Any, feature_names: list[str]) -> dict[str, float]:
    if isinstance(values, list):
        if len(values) > 1:
            array = np.array(values[1])
        else:
            array = np.array(values[0])
    else:
        array = np.array(values)

    if array.ndim == 2:
        array = array[0]

    return {
        feature_names[idx]: round(float(array[idx]), 6)
        for idx in range(min(len(feature_names), len(array)))
    }


def _persist_snapshot(
    session: Session,
    payload: dict[str, Any],
) -> None:
    as_json = json.dumps(payload["fatores"])
    session.execute(
        explainability_snapshot.insert().values(
            empresa_id=payload["id_cliente"],
            modelo=payload["modelo"],
            executado_em=datetime.now(timezone.utc),
            score=payload["score_modelo"],
            nivel_risco=payload["nivel_risco"],
            top_features=as_json,
            base_value=payload.get("base_value"),
            fonte="ml_service.storytelling",
        )
    )


def explicar_cliente(cliente_id: str) -> dict[str, Any]:
    canonical = (cliente_id or "").strip()
    if not canonical:
        raise ExplainabilityError("cliente_id nao pode ser vazio.")

    with session_scope() as session:
        empresa_row = session.execute(
            select(empresa).where(empresa.c.id == canonical)
        ).first()

        if not empresa_row:
            raise ExplainabilityError("Cliente nao encontrado na base.")

        financeiro = session.execute(
            select(
                empresa_financeiro.c.vl_fatu,
                empresa_financeiro.c.vl_sldo,
                empresa_financeiro.c.dt_ref,
            )
            .where(empresa_financeiro.c.empresa_id == canonical)
            .order_by(desc(empresa_financeiro.c.dt_ref))
            .limit(1)
        ).first()

        if financeiro is None:
            raise ExplainabilityError("Cliente sem dados financeiros para explicabilidade.")

        anos = _years_since(empresa_row._mapping.get("dt_abrt"))
        features = {
            "idade": round(anos, 3),
            "vl_fatu": _decimal(financeiro.vl_fatu),
            "vl_sldo": _decimal(financeiro.vl_sldo),
        }

        score, modelo_usado = calcular_score(features, modelo="rf")
        risco = avaliar_risco(score)

        frame = _build_feature_frame(features)
        try:
            explainer = _get_explainer("rf")
            shap_values = explainer.shap_values(frame)
            base_value = explainer.expected_value
            if isinstance(base_value, list):
                base_value = base_value[1] if len(base_value) > 1 else base_value[0]
            fatores = _extract_contributions(shap_values, list(frame.columns))
        except Exception as exc:  # pragma: no cover - fallback raro
            fatores = {
                "vl_fatu": round(features["vl_fatu"] * 0.00001, 6),
                "vl_sldo": round(features["vl_sldo"] * 0.00002, 6),
                "idade": round(features["idade"] * 0.01, 6),
            }
            base_value = score
            fatores["__fallback__"] = 1.0
            fatores["__erro__"] = float(score)
            fatores["__mensagem__"] = f"Fallback SHAP: {exc}"

        payload: dict[str, Any] = {
            "id_cliente": canonical,
            "score_modelo": round(float(score), 6),
            "nivel_risco": risco,
            "fatores": fatores,
            "modelo": modelo_usado,
            "metadados": {
                "gerado_em": datetime.utcnow().isoformat(),
                "fonte": "TreeExplainer(RandomForest)",
                "dt_financeiro": financeiro.dt_ref.isoformat() if financeiro.dt_ref else None,
            },
            "observacoes": [],
            "base_value": float(base_value),
        }

        threshold = session.execute(
            select(score_risco.c.threshold, score_risco.c.versao_modelo)
            .where(score_risco.c.empresa_id == canonical)
            .order_by(desc(score_risco.c.dt_calc))
            .limit(1)
        ).first()

        if threshold:
            payload["metadados"]["threshold_sugerido"] = float(_decimal(threshold.threshold or 0))
            payload["metadados"]["versao_modelo"] = threshold.versao_modelo

        _persist_snapshot(session, payload)
        return payload
