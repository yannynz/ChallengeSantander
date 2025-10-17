"""
Valida se as principais tabelas do storytelling possuem dados disponíveis.

Uso:
    python -m ml_service.data_quality
"""

from __future__ import annotations

from sqlalchemy import func, select

from .database import session_scope
from .data_access import schema


def main() -> None:
    with session_scope() as session:
        checks = {
            "empresa": session.execute(select(func.count()).select_from(schema.empresa)).scalar(),
            "empresa_financeiro": session.execute(select(func.count()).select_from(schema.empresa_financeiro)).scalar(),
            "score_risco": session.execute(select(func.count()).select_from(schema.score_risco)).scalar(),
            "decisao_credito": session.execute(select(func.count()).select_from(schema.decisao_credito)).scalar(),
            "centralidade_snapshot": session.execute(
                select(func.count()).select_from(schema.centralidade_snapshot)
            ).scalar(),
        }

    pendentes = [nome for nome, total in checks.items() if not total]

    if pendentes:
        raise SystemExit(
            f"Dados insuficientes para storytelling. Tabelas vazias: {', '.join(sorted(pendentes))}"
        )

    print("✅ Dados do storytelling validados com sucesso:", checks)


if __name__ == "__main__":
    main()
