from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Tuple

import json
import os
from copy import deepcopy
from threading import Lock
from urllib import error, parse, request

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    delete,
    select,
)
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from utils import get_engine

from forecasting import forecast_arima


class MacroSourceError(RuntimeError):
    """Erro ao consultar a fonte de dados macroeconômicos."""


@dataclass(frozen=True)
class MacroSerie:
    alias: str
    sgs_code: int
    descricao: str


SERIES: Dict[str, MacroSerie] = {
    "selic": MacroSerie(alias="selic", sgs_code=432, descricao="SELIC meta anual (%)"),
    "ipca": MacroSerie(alias="ipca", sgs_code=433, descricao="IPCA variação mensal (%)"),
    "pib": MacroSerie(alias="pib", sgs_code=4385, descricao="PIB trimestre vs mesmo período anterior (%)"),
}


CacheKey = Tuple[str, str, str, int]
CacheValue = Dict[str, object]

_CACHE: Dict[CacheKey, Tuple[datetime, CacheValue]] = {}
_CACHE_LOCK = Lock()
_CACHE_BACKEND_MODE = "memory"
_CACHE_TTL_MINUTES = 180
_CACHE_TTL = timedelta(minutes=_CACHE_TTL_MINUTES)
_HTTP_TIMEOUT_SECONDS = 10.0
_DB_CACHE_INITIALIZED = False
_DB_CACHE_INSTANCE: Optional["MacroCacheRepository"] = None


class MacroCacheRepository:
    """Persistência de cache de séries macroeconômicas em banco relacional."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        self._metadata = MetaData()
        self._table = Table(
            "macro_cache",
            self._metadata,
            Column("serie_alias", String(128), primary_key=True),
            Column("data_inicial", Date, primary_key=True),
            Column("data_final", Date, primary_key=True),
            Column("horizonte", Integer, primary_key=True),
            Column("payload", Text, nullable=False),
            Column("expires_at", DateTime(timezone=True), nullable=False),
            Column("updated_at", DateTime(timezone=True), nullable=False),
        )

        # Cria a tabela caso ainda não exista. Opera em modo best-effort: se falhar,
        # a exceção será propagada ao chamador para permitir fallback ao cache em memória.
        self._metadata.create_all(self._engine)

    def get(
        self,
        alias: str,
        data_inicial: date,
        data_final: date,
        horizonte: int,
        now: datetime,
    ) -> Optional[CacheValue]:
        stmt = select(self._table.c.payload, self._table.c.expires_at).where(
            self._table.c.serie_alias == alias,
            self._table.c.data_inicial == data_inicial,
            self._table.c.data_final == data_final,
            self._table.c.horizonte == horizonte,
        )

        with self._engine.begin() as conn:
            row = conn.execute(stmt).first()

        if not row:
            return None

        expires_at = self._normalize_datetime(row.expires_at)
        if expires_at and expires_at <= now:
            self.delete(alias, data_inicial, data_final, horizonte)
            return None

        try:
            payload = json.loads(row.payload)
        except ValueError:
            self.delete(alias, data_inicial, data_final, horizonte)
            return None

        return payload

    def store(
        self,
        alias: str,
        data_inicial: date,
        data_final: date,
        horizonte: int,
        payload: CacheValue,
        expires_at: datetime,
        updated_at: datetime,
    ) -> None:
        serialized = json.dumps(payload)

        delete_stmt = delete(self._table).where(
            self._table.c.serie_alias == alias,
            self._table.c.data_inicial == data_inicial,
            self._table.c.data_final == data_final,
            self._table.c.horizonte == horizonte,
        )

        insert_stmt = self._table.insert().values(
            serie_alias=alias,
            data_inicial=data_inicial,
            data_final=data_final,
            horizonte=horizonte,
            payload=serialized,
            expires_at=expires_at,
            updated_at=updated_at,
        )

        with self._engine.begin() as conn:
            conn.execute(delete_stmt)
            conn.execute(insert_stmt)

    def delete(self, alias: str, data_inicial: date, data_final: date, horizonte: int) -> None:
        stmt = delete(self._table).where(
            self._table.c.serie_alias == alias,
            self._table.c.data_inicial == data_inicial,
            self._table.c.data_final == data_final,
            self._table.c.horizonte == horizonte,
        )
        with self._engine.begin() as conn:
            conn.execute(stmt)

    def clear(self) -> None:
        with self._engine.begin() as conn:
            conn.execute(delete(self._table))

    @staticmethod
    def _normalize_datetime(value: object) -> Optional[datetime]:
        if isinstance(value, datetime):
            if value.tzinfo:
                return value.astimezone(timezone.utc)
            return value.replace(tzinfo=timezone.utc)

        if isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value)
            except ValueError:
                return None
            if parsed.tzinfo:
                return parsed.astimezone(timezone.utc)
            return parsed.replace(tzinfo=timezone.utc)

        return None


def configure_cache_from_env() -> None:
    """Recarrega configuração de cache baseada nas variáveis de ambiente."""

    global _CACHE_TTL_MINUTES, _CACHE_TTL, _HTTP_TIMEOUT_SECONDS
    global _CACHE_BACKEND_MODE, _DB_CACHE_INITIALIZED, _DB_CACHE_INSTANCE

    try:
        _CACHE_TTL_MINUTES = max(1, int(os.getenv("MACRO_CACHE_MINUTES", "180")))
    except ValueError:
        _CACHE_TTL_MINUTES = 180
    _CACHE_TTL = timedelta(minutes=_CACHE_TTL_MINUTES)

    timeout_raw = os.getenv("MACRO_HTTP_TIMEOUT_SECONDS") or os.getenv("MACRO_HTTP_TIMEOUT") or "10"
    try:
        _HTTP_TIMEOUT_SECONDS = max(1.0, float(timeout_raw))
    except ValueError:
        _HTTP_TIMEOUT_SECONDS = 10.0

    mode = (os.getenv("MACRO_CACHE_BACKEND", "memory") or "").strip().lower()
    if mode in {"", "memory", "off", "disabled", "none"}:
        _CACHE_BACKEND_MODE = "memory"
    else:
        _CACHE_BACKEND_MODE = mode

    _DB_CACHE_INITIALIZED = False
    _DB_CACHE_INSTANCE = None


configure_cache_from_env()


def _should_use_db_backend() -> bool:
    if _CACHE_BACKEND_MODE == "memory":
        return False
    if _CACHE_BACKEND_MODE in {"database", "db"}:
        return True
    if _CACHE_BACKEND_MODE == "auto":
        return any(
            os.getenv(env_var)
            for env_var in ("DATABASE_URL", "DB_HOST", "DB_NAME")
        )
    return False


def _get_db_cache() -> Optional[MacroCacheRepository]:
    global _DB_CACHE_INITIALIZED, _DB_CACHE_INSTANCE

    if not _should_use_db_backend():
        return None

    if _DB_CACHE_INITIALIZED:
        return _DB_CACHE_INSTANCE

    _DB_CACHE_INITIALIZED = True

    try:
        engine = get_engine()
        _DB_CACHE_INSTANCE = MacroCacheRepository(engine)
    except Exception:  # pragma: no cover - fallback resiliente
        _DB_CACHE_INSTANCE = None

    return _DB_CACHE_INSTANCE


def _load_from_persistent_cache(key: CacheKey) -> Optional[CacheValue]:
    repo = _get_db_cache()
    if not repo:
        return None

    alias, inicio_iso, fim_iso, horizonte = key
    try:
        return repo.get(
            alias,
            datetime.fromisoformat(inicio_iso).date(),
            datetime.fromisoformat(fim_iso).date(),
            horizonte,
            datetime.now(timezone.utc),
        )
    except (SQLAlchemyError, ValueError):
        return None


def _store_in_persistent_cache(key: CacheKey, value: CacheValue) -> None:
    repo = _get_db_cache()
    if not repo:
        return

    alias, inicio_iso, fim_iso, horizonte = key

    try:
        inicio = datetime.fromisoformat(inicio_iso).date()
        fim = datetime.fromisoformat(fim_iso).date()
    except ValueError:
        return

    now = datetime.now(timezone.utc)
    expires_at = now + _CACHE_TTL

    try:
        repo.store(alias, inicio, fim, horizonte, value, expires_at, now)
    except SQLAlchemyError:
        return


def clear_memory_cache() -> None:
    with _CACHE_LOCK:
        _CACHE.clear()


def clear_cache() -> None:
    clear_memory_cache()
    repo = _get_db_cache()
    if repo:
        try:
            repo.clear()
        except SQLAlchemyError:
            return


def resolve_serie(nombre: str) -> MacroSerie:
    key = (nombre or "").strip().lower()
    if not key:
        raise ValueError("Informe a série macroeconômica desejada.")

    if key in SERIES:
        return SERIES[key]

    # Permite que o consumidor passe o código numérico diretamente.
    if key.isdigit():
        return MacroSerie(alias=key, sgs_code=int(key), descricao=f"Série SGS {key}")

    raise ValueError(f"Série macroeconômica desconhecida: {nombre}")


def parse_from_date(valor: str | None, fallback_months: int = 24) -> date:
    if not valor:
        return date.today() - timedelta(days=30 * fallback_months)

    cleaned = valor.strip()
    if not cleaned:
        return date.today() - timedelta(days=30 * fallback_months)

    for fmt in ("%Y-%m-%d", "%Y-%m", "%d/%m/%Y"):
        try:
            parsed = datetime.strptime(cleaned, fmt)
            if fmt == "%Y-%m":
                parsed = parsed.replace(day=1)
            return parsed.date()
        except ValueError:
            continue

    raise ValueError("Formato de data inválido. Utilize YYYY-MM ou YYYY-MM-DD.")


def build_request_dates(inicio: date, fim: date | None = None) -> Tuple[str, str]:
    data_final = fim or date.today()
    if data_final < inicio:
        raise ValueError("Data final anterior à data inicial.")

    return inicio.strftime("%d/%m/%Y"), data_final.strftime("%d/%m/%Y")


def fetch_sgs_series(serie: MacroSerie, data_inicial: str, data_final: str) -> List[Dict[str, str]]:
    base_url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie.sgs_code}/dados"
    params = parse.urlencode({
        "formato": "json",
        "dataInicial": data_inicial,
        "dataFinal": data_final,
    })
    url = f"{base_url}?{params}"

    try:
        with request.urlopen(url, timeout=_HTTP_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        raise MacroSourceError(f"Falha ao consultar API do Banco Central: HTTP {exc.code}") from exc
    except error.URLError as exc:
        raise MacroSourceError(f"Falha ao consultar API do Banco Central: {exc.reason}") from exc

    try:
        payload = json.loads(raw)
    except ValueError as exc:
        raise MacroSourceError("Resposta inválida do Banco Central.") from exc

    if not isinstance(payload, list):
        raise MacroSourceError("Formato inesperado na resposta do Banco Central.")

    return payload


def deserialize_payload(payload: Iterable[Dict[str, str]]) -> Tuple[List[date], List[float]]:
    datas: List[date] = []
    valores: List[float] = []

    for registro in payload:
        data_str = (registro.get("data") or "").strip()
        valor_str = (registro.get("valor") or "").strip().replace(",", ".")

        if not data_str or not valor_str:
            continue

        try:
            data_iso = datetime.strptime(data_str, "%d/%m/%Y").date()
            valor = float(valor_str)
        except ValueError:
            continue

        datas.append(data_iso)
        valores.append(valor)

    return datas, valores


def generate_future_dates(last_date: date, horizonte: int, dates: List[date]) -> List[date]:
    if horizonte <= 0:
        return []

    if len(dates) >= 2:
        delta = dates[-1] - dates[-2]
    else:
        delta = timedelta(days=30)

    if delta.days <= 0:
        delta = timedelta(days=30)

    future_dates = []
    cursor = last_date
    for _ in range(horizonte):
        cursor += delta
        future_dates.append(cursor)
    return future_dates


def _get_from_cache(key: CacheKey) -> CacheValue | None:
    now = datetime.utcnow()
    with _CACHE_LOCK:
        entry = _CACHE.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if now >= expires_at:
            _CACHE.pop(key, None)
            return None
        return deepcopy(value)


def _store_in_cache(key: CacheKey, value: CacheValue) -> None:
    expires_at = datetime.utcnow() + _CACHE_TTL
    with _CACHE_LOCK:
        _CACHE[key] = (expires_at, deepcopy(value))


def get_macro_forecast(
    serie: str,
    from_date: str | None,
    horizonte: int | None = None,
) -> Dict[str, object]:
    metadata = resolve_serie(serie)
    inicio = parse_from_date(from_date)
    data_final_date = date.today()
    data_inicial_str, data_final_str = build_request_dates(inicio, data_final_date)
    horizonte = int(horizonte) if horizonte not in (None, "") else 3
    if horizonte < 0:
        raise ValueError("Horizonte deve ser não negativo.")

    cache_key: CacheKey = (
        metadata.alias,
        inicio.isoformat(),
        data_final_date.isoformat(),
        horizonte,
    )
    cached = _get_from_cache(cache_key)
    if cached is not None:
        return cached

    persisted = _load_from_persistent_cache(cache_key)
    if persisted is not None:
        _store_in_cache(cache_key, persisted)
        return deepcopy(persisted)

    payload = fetch_sgs_series(metadata, data_inicial_str, data_final_str)
    datas, valores = deserialize_payload(payload)

    if not datas or not valores:
        raise MacroSourceError("Nenhum dado retornado para a série informada.")

    previsao: List[float] = []
    if horizonte > 0:
        previsao = forecast_arima(valores, horizonte)

    future_dates = generate_future_dates(datas[-1], horizonte, datas)

    resultado = {
        "serie": valores,
        "forecast": previsao,
        "historicoTimestamps": [d.isoformat() for d in datas],
        "forecastTimestamps": [d.isoformat() for d in future_dates],
        "horizonte": horizonte,
        "fonte": f"Banco Central do Brasil - SGS {metadata.sgs_code} ({metadata.descricao})",
        "serieId": metadata.alias,
        "descricao": metadata.descricao,
        "ultimaAtualizacao": datas[-1].isoformat(),
    }

    _store_in_cache(cache_key, resultado)
    _store_in_persistent_cache(cache_key, resultado)
    return deepcopy(resultado)
