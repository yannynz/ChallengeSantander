![Build Status](https://github.com/yannynz/ChallengeSantander/actions/workflows/ci.yml/badge.svg)

# Challenge Santander – Plataforma de Crédito PJ

> Storytelling conectado a dados reais: FastAPI ↔ Spring Boot ↔ Angular.

---

## Arquitetura Geral

```
Front-end Angular → core-api (Spring Boot) → ml_service (FastAPI)
                                        ⇘                  ⇙
                                 Postgres / MinIO / Modelos
```

- **ml_service**: consulta Postgres com SQLAlchemy, executa SHAP, gera métricas reais (`validation.py`) e registra logs de simulação.
- **core-api**: expõe DTOs tipados via Feign, aplica cache Caffeine (5 min) e trata erros específicos.
- **front-end**: storytelling com dados reais, fallback controlado via feature flag em `localStorage`/`window`.

Documentação detalhada das rotas de storytelling: [`docs/storytelling-real-data.md`](docs/storytelling-real-data.md)

---

## Quickstart

```bash
# 1. Subir tudo (Postgres, MinIO, ETL, ml_service, core_api, front-end)
docker compose up --build

# 2. (Opcional) Popular novamente o Postgres
docker compose run --rm etl

# 3. Validar dados obrigatórios do storytelling
docker compose exec ml_service python -m data_quality

# 4. Atualizar métricas com dados reais
docker compose exec ml_service python -m validation
```

> **Dica:** os containers `etl` e `trainer` rodam uma vez e finalizam. Verifique os logs ao subir com `docker compose logs -f etl`.

---

## ml_service (FastAPI)

### Rotas principais

| Rota | Descrição | Fonte de dados |
|------|-----------|----------------|
| `GET /api/impacto?limit=5&janela=180` | Ganhos de limite + rede de influência | `decisao_credito`, `score_risco`, `centralidade_snapshot` |
| `GET /api/explain/{id}` | SHAP real (TreeExplainer) + fallback documentado | `empresa`, `empresa_financeiro`, `score_risco`, modelos em `models/` |
| `GET /api/metrics?refresh=true` | Métricas de validação + drift PSI | `validation.py` + `metrics.json` |
| `POST /api/simulador` | Score real + logging de auditoria | `simulacao_credito_log` |

### Scripts de suporte

```bash
python -m ml_service.sna               # Gera centralidades reais (grafo)
python -m ml_service.validation       # Atualiza metrics.json com dados reais
python -m ml_service.data_quality     # Garante que as tabelas core não estão vazias
```

- Logs de explicabilidade: `explainability_snapshot`
- Logs do simulador: `simulacao_credito_log`

### Testes

```bash
cd ml_service
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt       # Python 3.11+ (wheels completos)
pytest
```

> Em distribuições Python 3.13, instale dependências via Docker (`docker compose exec ml_service bash`) para evitar falhas de compilação de C-extensions.

---

## core-api (Spring Boot)

- DTOs públicos em `com.credito.core.model.dto.storytelling`.
- Caching via Caffeine (`CacheConfig`) com `@Cacheable` / `@CacheEvict`.
- `InsightsController` aceita `limit`, `janela` e `refresh` (push-cache) e propaga códigos 4xx/5xx do ml_service.

### Testes

```bash
cd core-api
mvn test        # usa Testcontainers/Postgres
```

> O profile padrão utiliza o Postgres do docker-compose (`SPRING_PROFILES_ACTIVE=docker`). Para ambiente local, configure `SPRING_DATASOURCE_URL` e afins conforme necessário.

---

## Front-end (Angular 18)

- Rotas `/impacto`, `/explicabilidade`, `/metrics`, `/simulador` consomem os novos contratos.
- Estados de carregamento/erro refinados, badges com `fonte`/`atualizado_em` e mensagens de fallback acessíveis.
- **Feature flag**: real por padrão. Para habilitar mocks temporários:

```js
localStorage.setItem('useRealStorytelling', 'false');
// ou
window.__USE_REAL_STORYTELLING__ = false;
```

Remova a flag para reativar os dados reais.

### Testes

```bash
cd front-end
npm install
CHROME_BIN=$(which chromium || which google-chrome) npm run test:ci
```

Sem Chrome local? Instale o Chromium headless (`sudo apt-get install chromium`) ou use `npx playwright install --with-deps` para baixar um binário dedicado.

---

## Observabilidade & Auditoria

- **ml_service**: logs estruturados + caches em memória via SQLAlchemy pre_ping.
- **core-api**: métricas Prometheus em `/actuator/prometheus`; caching com estatísticas Caffeine.
- **validation.py**: inclui `atualizado_em`, `fonte`, `janela_dias` e `drift_psi` para exibição no front-end.

---

## Pipeline de Storytelling

1. **Preparar dados** (ETL, validação, centralidades).
2. **Atualizar modelos** (`docker compose run trainer` se necessário).
3. **Validar storytelling**:
   - `python -m ml_service.data_quality`
   - `python -m ml_service.validation`
4. **Executar suíte de testes**:
   - `pytest` (ml_service)
   - `mvn test` (core-api)
   - `npm test` (front-end, requer Chrome/headless)
5. **Deploy via docker-compose** ou pipeline CI/CD existente.

---

## Perguntas Frequentes

- **Como trocar a janela padrão do impacto?**  
  Ajuste `limit`/`janela` ao chamar `/api/impacto` ou configure cache TTL/Caffeine se quiser intervalos maiores.

- **Onde ficam os logs de explicabilidade?**  
  Tabela `explainability_snapshot`, com `top_features` serializado e `base_value`.

- **Como rodar somente com mocks?**  
  Front-end flag (`useRealStorytelling=false`) e não executar `data_quality`/`validation.py`. As rotas ainda responderão com fallback legível no front.

---

## Próximos Passos sugeridos

1. **Validar disponibilidade de dados reais** a cada nova carga: automatize `python -m ml_service.data_quality` no pipeline de dados.
2. **Confirmar requisitos de negócio** para filtros dinâmicos (ex.: segmentos, faixas de limite) antes de expandir `/api/impacto`.
3. Evoluir monitoramento adicionando `prometheus_client` no FastAPI e dashboards específicos (PSI, tempo de resposta, cache hit).

---

### Licença
Projeto acadêmico do Challenge Santander – uso interno/educacional.
