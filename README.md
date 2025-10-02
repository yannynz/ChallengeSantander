# Plataforma de Crédito PJ

## Sumário
1. [Visão Geral](#1-visão-geral)
2. [Arquitetura e Fluxos](#2-arquitetura-e-fluxos)
   1. [Mapa de Diretórios](#21-mapa-de-diretórios)
   2. [Fluxo de Alto Nível](#22-fluxo-de-alto-nível)
   3. [Tecnologias Principais](#23-tecnologias-principais)
3. [Requisitos de Ambiente](#3-requisitos-de-ambiente)
   1. [Ferramentas Necessárias](#31-ferramentas-necessárias)
   2. [Variáveis de Ambiente por Serviço](#32-variáveis-de-ambiente-por-serviço)
4. [Execução com Docker Compose](#4-execução-com-docker-compose)
5. [Execução Manual por Componente](#5-execução-manual-por-componente)
   1. [Banco de Dados e Seed](#51-banco-de-dados-e-seed)
   2. [Pipelines ETL](#52-pipelines-etl)
   3. [Serviço de Machine Learning (`ml_service`)](#53-serviço-de-machine-learning-ml_service)
   4. [API Principal (`core-api`)](#54-api-principal-core-api)
   5. [Front-end Angular (`front-end`)](#55-front-end-angular-front-end)
6. [Modelo de Dados Relacional](#6-modelo-de-dados-relacional)
7. [Pipelines Analíticos e Modelagem](#7-pipelines-analíticos-e-modelagem)
8. [APIs de Negócio e Integrações](#8-apis-de-negócio-e-integrações)
   1. [Core API](#81-core-api)
   2. [Serviço de ML](#82-serviço-de-ml)
   3. [Front-end](#83-front-end)
9. [Testes e Garantia de Qualidade](#9-testes-e-garantia-de-qualidade)
10. [Operação, Logs e Monitoramento](#10-operação-logs-e-monitoramento)
11. [Solução de Problemas](#11-solução-de-problemas)
12. [Roadmap e Próximos Passos](#12-roadmap-e-próximos-passos)
13. [Referências Úteis](#13-referências-úteis)

---

## 1. Visão Geral
A Plataforma de Crédito PJ integra ingestão de dados, cálculo de indicadores e disponibilização de decisões de crédito para empresas. O projeto combina quatro camadas principais:

- **ETL (Python)**: carrega planilhas de bases históricas para o banco relacional.
- **Core API (Spring Boot)**: oferece endpoints REST para cadastro de empresas, cálculo de score e análise de rede.
- **Serviço de ML (FastAPI)**: centraliza algoritmos de score, forecasting, análises de rede (SNA) e consultas macroeconômicas.
- **Front-end (Angular SSR)**: apresenta dashboards, busca de empresas e visualizações interativas.

O repositório inclui ainda scripts de infraestrutura (Docker Compose, ambientes auxiliares) e documentação de suporte para o desafio.

## 2. Arquitetura e Fluxos

### 2.1 Mapa de Diretórios
```
plataforma-credito-pj/
├── core-api/                # Serviço Spring Boot (REST + persistência)
├── etl/                     # Pipelines Python para ingestão das Bases 1 e 2
├── front-end/               # Aplicação Angular (SSR + SPA)
├── ml_service/              # Serviço FastAPI para modelos, séries e SNA
├── infra/                   # Recursos auxiliares (MinIO, scripts de notebook, Postgres)
├── docker-compose.yml       # Orquestra todos os serviços em containers
├── requirements.txt         # Dependências Python para automação/analises locais
├── CONTEXT_NOTES.md         # Histórico de decisões técnicas (diário do projeto)
└── README.md                # Este guia completo
```

### 2.2 Fluxo de Alto Nível
1. **Ingestão**: scripts em `etl/` leem `Challenge FIAP - Bases.xlsx` e persistem dados normalizados em PostgreSQL.
2. **Persistência**: Core API acessa e manipula tabelas `empresa`, `empresa_financeiro`, `transacao`, `score_risco`, `decisao_credito`.
3. **Inteligência**: Core API delega cálculos preditivos para `ml_service` (score, macro, SNA, forecasting).
4. **Experiência Usuário**: Angular consome Core API e exibe dashboards e painéis por empresa.
5. **Observabilidade**: logs estruturados em cada camada permitem rastrear chamadas ponta a ponta.

Fluxo principal (simplificado):
```
Excel -> ETL -> Postgres <- Core API -> ML Service
                                ^
                                |
                             Front-end
```

### 2.3 Tecnologias Principais
- **Banco de Dados**: PostgreSQL 15 (Docker), suporte a SQLite para testes locais.
- **Back-end**: Java 21 + Spring Boot 3, OpenFeign, Jakarta Validation.
- **Machine Learning**: Python 3.11, FastAPI, scikit-learn, xgboost, statsmodels, NetworkX.
- **Front-end**: Angular 20 (standalone components), Angular Material, ApexCharts, SSR via Express.
- **Infraestrutura**: Docker Compose, MinIO opcional, scripts de seed/teste.

## 3. Requisitos de Ambiente

### 3.1 Ferramentas Necessárias
| Ferramenta | Versão recomendada | Uso |
|-----------|--------------------|-----|
| Docker / Docker Compose | 24+ | Orquestração completa em containers |
| Java JDK | 21 | Build/execução do `core-api` fora de containers |
| Maven | 3.9+ | Build e testes do `core-api` |
| Node.js | 20 LTS | Desenvolvimento do front-end Angular |
| npm | 10 | Gerenciamento de pacotes Angular |
| Python | 3.11 | Execução do ETL e serviço de ML manualmente |
| pip / virtualenv | 23+ | Isolamento de dependências Python |
| PSQL Client | 15 | Acesso ao banco para troubleshooting |

### 3.2 Variáveis de Ambiente por Serviço
| Serviço | Variável | Descrição | Valor default (docker) |
|---------|----------|-----------|------------------------|
| Banco | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Configuração base do Postgres | `credito_pj`, `postgres`, `postgres` |
| ETL | `DATABASE_URL` | Connection string SQLAlchemy | `postgresql://postgres:postgres@postgres:5432/credito_pj` |
| ETL | `BASE_FILE` | Caminho para a planilha `Challenge FIAP - Bases.xlsx` | `Challenge FIAP - Bases.xlsx` |
| Core API | `SPRING_DATASOURCE_URL` | JDBC da base transacional | `jdbc:postgresql://postgres:5432/credito_pj` |
| Core API | `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | Credenciais | `postgres`/`postgres` |
| Core API | `ML_SERVICE_URL` (`ml.service.url`) | Endpoint do serviço de ML | `http://ml_service:8000` |
| Core API | `APP_CORS_ALLOWED-ORIGINS` | Origens liberadas via CORS | `http://localhost:4200,http://127.0.0.1:4200` |
| ML Service | `DATABASE_URL` | Persistência opcional (SQLite/Postgres) para cache de séries | `postgresql://postgres:postgres@postgres:5432/credito_pj` |
| ML Service | `ML_MODELS_DIR` | Pasta com modelos pré-treinados | `ml_service/models` |
| Front-end | `PORT` (SSR) | Porta usada pelo server-side rendering | `4000` |

> **Boa prática**: criar um arquivo `.env` na raiz para exportar variáveis personalizadas quando executar localmente sem Docker.

## 4. Execução com Docker Compose
1. **Build das imagens** (executa maven, pip e npm automaticamente):
   ```bash
   docker compose build
   ```
2. **Subir os serviços**:
   ```bash
   docker compose up
   ```
3. Serviços disponíveis após inicialização:
   - Core API: http://localhost:8080
   - Front-end (SSR): http://localhost
   - ML Service: http://localhost:8000
   - Postgres: localhost:5432 (usuario/senha `postgres`)
   - MinIO (opcional): http://localhost:9000
4. **Processo de seed**: o container `etl` é executado automaticamente para carregar as tabelas.
5. **Parar os serviços**:
   ```bash
   docker compose down
   ```
6. **Limpar volumes** (remover dados persistidos):
   ```bash
   docker compose down -v
   ```

## 5. Execução Manual por Componente

### 5.1 Banco de Dados e Seed
1. Inicie um PostgreSQL local (Docker ou serviço instalado).
   ```bash
   docker run --name credito-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=credito_pj \
     -p 5432:5432 -d postgres:15
   ```
2. Verifique a conexão:
   ```bash
   psql postgresql://postgres:postgres@localhost:5432/credito_pj
   ```

### 5.2 Pipelines ETL
1. Crie e ative um ambiente virtual:
   ```bash
   cd etl
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Defina variáveis (opcional se usar defaults do Docker):
   ```bash
   export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credito_pj
   export BASE_FILE="Challenge FIAP - Bases.xlsx"
   ```
3. Execute as cargas:
   ```bash
   python run_all.py
   ```
4. Scripts específicos:
   - `etl_base1.py`: cadastra empresas e snapshots financeiros (tabela `empresa_financeiro`).
   - `etl_base2.py`: insere transações (tabela `transacao`).
5. Rodar testes automatizados:
   ```bash
   DATABASE_URL=sqlite:///etl_test.db pytest
   ```
   Os testes validam operações de upsert para evitar duplicidade de registros.

### 5.3 Serviço de Machine Learning (`ml_service`)
1. Ambiente Python:
   ```bash
   cd ml_service
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Variáveis mínimas:
   ```bash
   export DATABASE_URL=sqlite:///ml_service.db
   ```
3. Pre-aqueça o cache macro (opcional, evita primeira requisição lenta):
   ```bash
   python prewarm_macro_cache.py
   ```
4. Inicie o serviço:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
5. Testes unitários e de integração:
   ```bash
   DATABASE_URL=sqlite:///ml_service_test.db pytest
   ```
   Abrange forecasting, macros e comportamento de fallback.
6. Treinamento de modelos (RandomForest e XGBoost):
   ```bash
   python train_models.py
   ```
   Novos artefatos são salvos em `ml_service/models`.

### 5.4 API Principal (`core-api`)
1. Configure o Java 21 e Maven.
2. Ajuste variáveis conforme necessário:
   ```bash
   export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/credito_pj
   export SPRING_DATASOURCE_USERNAME=postgres
   export SPRING_DATASOURCE_PASSWORD=postgres
   export ML_SERVICE_URL=http://localhost:8000
   ```
3. Execute localmente:
   ```bash
   cd core-api
   ./mvnw spring-boot:run
   ```
4. Build jar:
   ```bash
   ./mvnw clean package
   java -jar target/core-api-*.jar
   ```
5. Logs relevantes:
   - Consultas de score exibem `[SCORE]` com métricas e payload enviado ao ML Service.
   - Falhas de centralidade geram `WARN` com tentativa de fallback.
6. Testes (quando presentes):
   ```bash
   ./mvnw test
   ```

### 5.5 Front-end Angular (`front-end`)
1. Instale dependências:
   ```bash
   cd front-end
   npm install
   ```
2. Desenvolvimento (hot reload):
   ```bash
   npm run start
   ```
   - App disponível em http://localhost:4200
   - Proxy de API configurado para `http://localhost:8080`
3. SSR / produção local:
   ```bash
   npm run build
   npm run serve:ssr:front-end
   ```
4. Testes unitários (Karma):
   ```bash
   npm run test
   ```
5. Padrões de código:
   - Angular Material + SCSS modular.
   - Interceptor JWT injeta `Authorization` quando token disponível no `localStorage`.
   - `ApiService` resolve dinamicamente a base dos endpoints com fallback para hosts conhecidos.

## 6. Modelo de Dados Relacional
| Tabela | Campos principais | Descrição |
|--------|-------------------|-----------|
| `empresa` | `id` (PK), `cnpj`, `ds_cnae`, `dt_abrt` | Dados cadastrais da empresa |
| `empresa_financeiro` | `id`, `empresa_id`, `dt_ref`, `vl_fatu`, `vl_sldo` | Snapshots financeiros mensais |
| `transacao` | `id`, `id_pgto`, `id_rcbe`, `vl`, `ds_tran`, `dt_ref` | Transações entre participantes |
| `score_risco` | `id`, `empresa_id`, `score`, `modelo`, `versao_modelo`, `dt_calc` | Histórico do score calculado |
| `decisao_credito` | `id`, `empresa_id`, `dt_decisao`, `score`, `aprovacao`, `limite`, `motivo`, `decisao` | Resultado final da análise de crédito |
| `centralidade_snapshot` | `empresa_id`, métricas SNA, `dt_calc` | Métricas de rede calculadas pelo ML Service |
| `macro_cache` | `serie_alias`, `data_inicial`, `data_final`, `horizonte`, `payload`, `expires_at` | Cache persistente de séries do BCB |

Índices e chaves:
- `empresa_financeiro`: `UNIQUE (empresa_id, dt_ref)` garante um snapshot por mês.
- `transacao`: recomenda-se índice composto (`id_pgto`, `id_rcbe`, `dt_ref`) para consultas frequentes.
- `score_risco`: registros apagam a necessidade de recomputar score quando dados iguais são solicitados.

## 7. Pipelines Analíticos e Modelagem
1. **`etl_base1`**
   - Normaliza identificadores (`_normalize_cnpj`).
   - Carrega dados cadastrais e financeiros.
   - Executa *upsert* (Postgres) ou *delete+insert* (SQLite) através de `upsert_dataframe`.
2. **`etl_base2`**
   - Converte datas Excel para formatos padrão (`_normalize_excel_date`).
   - Remove linhas sem valores essenciais.
   - Insere transações em lote via `to_sql`.
3. **`train_models`**
   - Integra dados de `empresa` e `empresa_financeiro`.
   - Define variável alvo (`vl_sldo` negativo => risco).
   - Treina **RandomForest** e **XGBoost** com hiperparâmetros estáveis para produção.
4. **`ml_service`**
   - `calcular_score`: organiza features, seleciona modelo, garante números finitos.
   - `forecast_arima`: utiliza Statsmodels; fallback linear para séries curtas.
   - `calcular_centralidades`: monta grafo dirigido com NetworkX e calcula grau, betweenness, eigenvector e clusters.
   - `get_macro_forecast`: busca série pública no BCB, aplica cache in-memory + persistente.
5. **Scripts utilitários**
   - `prewarm_macro_cache.py`: popula cache do BCB para séries pré-definidas.
   - `run_all.py`: orquestra execução sequencial das cargas.

## 8. APIs de Negócio e Integrações

### 8.1 Core API
Base: `http://localhost:8080`

| Método | Endpoint | Descrição | Observações |
|--------|----------|-----------|-------------|
| `POST` | `/decisoes` | Gera nova decisão de crédito | Entrada `DecisaoCreateRequest` (contém `empresaId`). Retorna `DecisaoResponse` com score atualizado. |
| `GET` | `/decisoes` | Lista decisões vigentes | Parâmetros `empresaId` (opcional), `limit` (1-200). Deduplica por empresa, trazendo decisão atual. |
| `GET` | `/empresas` | Lista empresas disponíveis | Paginação futura pode ser adicionada. |
| `GET` | `/empresas/{identifier}` | Retorna empresa por ID ou CNPJ | Usa `EmpresaResolverService` (aceita ID, CNPJ formatado ou não). |
| `GET` | `/empresas/{identifier}/score` | Calcula e persiste score de risco | Reprocessa histórico financeiro, chama `/ml/v1/score`, armazena resultado em `score_risco`. Resposta inclui features utilizadas e histórico de scores. |
| `GET` | `/empresas/{identifier}/rede` | Consolida rede de relacionamento | Busca transações; se necessário consulta `/ml/v1/sna/centralidades`. Retorna nós, arestas e métricas agregadas por empresa. |
| `GET` | `/macro` | Externo (exemplo legacy) | Endpoint mantido para compatibilidade, recomendação é usar `/ml/v1/macro/{serie}` direto no ML Service. |

Headers padrão: `Content-Type: application/json`. Respostas de erro seguem `ProblemDetail` (HTTP RFC7807) com mensagem localizável.

### 8.2 Serviço de ML
Base: `http://localhost:8000/ml/v1`

| Método | Endpoint | Payload exemplo | Resposta |
|--------|----------|-----------------|----------|
| `POST` | `/score` | `{ "features": {"idade": 5, "vl_fatu": 100000, "vl_sldo": 20000}, "modelo": "rf" }` | `{ "score": 0.82, "modelo": "RandomForest", "versao": "1.0.0" }` |
| `POST` | `/forecast/arima` | `{ "serie": [100,110,120,130,140], "horizonte": 3 }` | `{ "forecast": [150.12, 160.34, 170.56] }` |
| `POST` | `/sna/centralidades` | `{ "edges": [{"source": "A", "target": "B", "weight": 123}] }` | `{ "grau": {"A": 0.5, ...}, "betweenness": {...}, "eigenvector": {...}, "clusters": {...} }` |
| `GET` | `/macro/{serie}` | `/macro/ipca?from=2022-01-01&horizonte=6` | Estrutura com série histórica, previsão e metadados de cache |

Erros retornam HTTP 400 (validação) ou 502 (falha na origem externa). Cache macro expira após 24h (ver `_CACHE_TTL`).

### 8.3 Front-end
Principais telas:
- **Login**: autenticação simulada (token fictício persistido em `localStorage`).
- **Dashboard**: resumo com cards (score, rede, alertas, macro) e busca global.
- **Detalhe da Empresa**: abas para decisões, histórico de score, rede e indicadores macro.
- **KPIs**: visão executiva consolidada.

Integração com API:
- `AuthService` controla sessão; `jwt-interceptor` injeta cabeçalho JWT quando presente.
- `ApiService` determina a URL base usando heurísticas (SSR -> `http://core-api:8080`; browser -> `window.location`).
- Componentes de rede usam `vis-network` para visualização de grafos.

## 9. Testes e Garantia de Qualidade
| Camada | Ferramenta | Comando | Cobertura |
|--------|------------|---------|-----------|
| ETL | `pytest` | `DATABASE_URL=sqlite:///etl_test.db pytest` | Upserts, idempotência, normalização de dados |
| ML Service | `pytest` | `DATABASE_URL=sqlite:///ml_service_test.db pytest` | Forecasting, macro, comportamento de cache |
| Core API | `mvn test` | `./mvnw test` | Estrutura pronta para testes Spring, adicionar conforme evolução |
| Front-end | `ng test` | `npm run test` | Testes de componentes (Angular + Karma) |
| Integração manual | `curl`/Postman | Ex.: `curl http://localhost:8080/empresas/EMP_01/score` | Validação ponta-a-ponta |

Recomenda-se executar a suíte Python em SQLite para velocidade e reproduzir testes críticos em Postgres antes de deploy.

## 10. Operação, Logs e Monitoramento
- **Core API**: logs SLF4J com marcadores `[SCORE]` e stack traces amigáveis. Ajuste `logging.level.com.credito=DEBUG` para depuração.
- **ML Service**: FastAPI expõe `/docs` e `/redoc`. Ative `uvicorn` com `--log-level debug` para rastrear chamadas.
- **ETL**: imprime status com emojis (✅/⚠️); redirecione para arquivo (`python run_all.py > etl.log`).
- **Front-end**: console do navegador registra guardas de rota e problemas de rede.
- **Observabilidade futura**: recomenda-se integrar Prometheus/Grafana ou APM (New Relic) para métricas de latência.

## 11. Solução de Problemas
| Sintoma | Causa provável | Correção |
|---------|----------------|----------|
| Core API retorna 502 ao calcular score | `ml_service` indisponível ou URL incorreta | Verifique container `ml_service`, ajuste `ML_SERVICE_URL` |
| `psycopg2.OperationalError` no ETL | Postgres ainda não está pronto | Aguarde contêiner inicializar ou use `depends_on` com `healthcheck` |
| Forecast macro muito lento | Cache frio ou indisponibilidade do BCB | Execute `prewarm_macro_cache.py` ou reutilize valores anteriores |
| Front-end não carrega API | CORS bloqueado ou base URL mal resolvida | Confirme cabeçalho `Access-Control-Allow-Origin` e origens configuradas |
| `ValueError: Formato de data inválido` no macro | Query string `from` em formato não suportado | Utilize `YYYY-MM-DD`, `YYYY-MM` ou `DD/MM/YYYY` |
| Score sempre 0.5 | Modelos ausentes (`ml_service/models`) | Execute `python train_models.py` para recriar arquivos `.pkl` |

## 12. Roadmap e Próximos Passos
1. **Core API**
   - Implementar paginação/ordenacão em `/empresas`.
   - Validar JSON Schema de entrada para `/decisoes`.
   - Adicionar testes de integração simulando respostas do ML Service.
2. **ML Service**
   - Persistir histórico de centralidades em Postgres com limpeza automática.
   - Incluir modelos adicionais (LightGBM) e validação cruzada automatizada.
   - Disponibilizar métricas Prometheus (`/metrics`).
3. **Front-end**
   - Internacionalização (i18n) e filtros avançados de empresas.
   - Testes end-to-end com Playwright (setup já presente em `devDependencies`).
4. **Dados**
   - Automatizar atualização diária da planilha base.
   - Implementar CDC (Change Data Capture) para transações em tempo real.

## 13. Referências Úteis
- [Documentação Spring Boot](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Angular Material 3](https://material.angular.dev/)
- [Banco Central do Brasil - Séries Temporais](https://dadosabertos.bcb.gov.br/dataset/servico-de-series-temporais)
- [NetworkX Guide](https://networkx.org/documentation/stable/reference/index.html)
- [Statsmodels ARIMA](https://www.statsmodels.org/stable/generated/statsmodels.tsa.arima.model.ARIMA.html)

---

**Contato e suporte**: descreva incidentes abrindo issues ou consultando o time responsável pelo desafio.
