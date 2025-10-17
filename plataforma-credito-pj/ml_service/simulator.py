from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Mapping

from sqlalchemy import select

from .database import session_scope
from .data_access.schema import centralidade_snapshot, simulacao_credito_log
from .scoring import calcular_score
from .storytelling_utils import avaliar_risco, normalizar_score


def _derivar_features(payload: Mapping[str, Any]) -> dict[str, float]:
    renda = float(payload.get("renda") or 0.0)
    idade = float(payload.get("idade") or 0.0)
    historico = float(payload.get("historico") or 0.0)
    historico = normalizar_score(historico)

    vl_fatu = max(renda * 12.0, 0.0)
    vl_sldo = max(renda * (0.8 + historico * 0.6), 0.0)

    return {
        "idade": max(idade, 0.0),
        "vl_fatu": vl_fatu,
        "vl_sldo": vl_sldo,
    }


def _calcular_influencia(conexoes: int) -> float:
    influencia = min(max(conexoes, 0), 200) / 40.0
    return round(normalizar_score(influencia), 4)


def _estimar_limite(renda: float, risco: str, score: float) -> float:
    multiplicadores = {
        "baixo": 2.5,
        "medio": 1.6,
        "moderado": 1.1,
        "alto": 0.5,
    }
    base = multiplicadores.get(risco, 1.0)
    ajuste = 0.5 + score
    limite = renda * base * ajuste
    return round(max(limite, 1000.0), 2)


def simular(payload: Mapping[str, Any]) -> dict[str, Any]:
    usuario = (payload.get("usuario") or "front-end").strip() or "front-end"

    features = _derivar_features(payload)
    score, modelo = calcular_score(features, modelo="rf")
    risco = avaliar_risco(score)
    renda = float(payload.get("renda") or 0.0)
    influencia = _calcular_influencia(int(payload.get("conexoes_rede") or 0))
    limite = _estimar_limite(renda, risco, score)

    mensagem = {
        "baixo": "Perfil com risco baixo e espaco para aumento imediato de limite.",
        "medio": "Perfil equilibrado, sugere-se revisao manual antes da aprovacao final.",
        "moderado": "Requer mitigacoes adicionais ou ajustes de limite.",
        "alto": "Risco elevado - recomendada negativa automatica.",
    }.get(risco, "Perfil nao categorizado.")

    payload_resposta = {
        "score": round(float(score), 4),
        "risco": risco,
        "modelo": modelo,
        "influencia_rede": influencia,
        "limite_sugerido": limite,
        "mensagem": mensagem,
        "metadados": {"gerado_em": datetime.utcnow().isoformat()},
    }

    _registrar_simulacao(usuario, payload, payload_resposta)
    return payload_resposta


def _registrar_simulacao(
    usuario: str,
    parametros: Mapping[str, Any],
    resposta: Mapping[str, Any],
) -> None:
    with session_scope() as session:
        session.execute(
            simulacao_credito_log.insert().values(
                registrado_em=datetime.now(timezone.utc),
                usuario=usuario,
                payload=json.dumps(dict(parametros)),
                score=resposta.get("score"),
                risco=resposta.get("risco"),
                limite_sugerido=resposta.get("limite_sugerido"),
            )
        )


def estimar_influencia_media(empresa_id: str | None) -> float | None:
    if not empresa_id:
        return None

    with session_scope() as session:
        row = session.execute(
            select(centralidade_snapshot.c.eigenvector)
            .where(centralidade_snapshot.c.empresa_id == empresa_id)
            .order_by(centralidade_snapshot.c.dt_calc.desc())
            .limit(1)
        ).first()

        if not row:
            return None
        valor = row.eigenvector
        if valor is None:
            return None
        return round(normalizar_score(float(valor)), 4)
