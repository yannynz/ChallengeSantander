from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping


@dataclass(frozen=True)
class RiscoFaixa:
    nome: str
    minimo: float


FAIXAS_RISCO: tuple[RiscoFaixa, ...] = (
    RiscoFaixa("alto", 0.0),
    RiscoFaixa("moderado", 0.4),
    RiscoFaixa("medio", 0.55),
    RiscoFaixa("baixo", 0.75),
)


def normalizar_score(valor: float) -> float:
    return max(0.0, min(1.0, float(valor)))


def avaliar_risco(score: float) -> str:
    score = normalizar_score(score)
    for faixa in reversed(FAIXAS_RISCO):
        if score >= faixa.minimo:
            return faixa.nome
    return FAIXAS_RISCO[0].nome


def format_percentual(score: float, casas: int = 2) -> float:
    return round(normalizar_score(score), casas)


def extrair_principais_fatores(fatores: Mapping[str, float], limite: int = 5) -> dict[str, float]:
    ordenado = sorted(fatores.items(), key=lambda item: abs(item[1]), reverse=True)
    return {chave: valor for chave, valor in ordenado[:limite]}


def media(values: Iterable[float]) -> float:
    lista = list(values)
    if not lista:
        return 0.0
    return sum(lista) / len(lista)
