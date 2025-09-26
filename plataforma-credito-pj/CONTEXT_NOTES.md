# Plataforma Crédito PJ – Contexto das Alterações

## Visão Geral
- Docker Compose orquestra os serviços usando `condition`/healthcheck e serve o front-end já compilado via nginx.
- Core API resolve empresas por ID ou CNPJ, usa dados reais do Postgres para score/rede e persiste metadados consistentes vindos do serviço de ML.
- Pipelines ETL/ML são idempotentes, aceitam `DATABASE_URL` (Postgres ou SQLite) e contam com script único `run_all.py` para carregar Base 1 e Base 2.
- Front-end busca empresas com identificador canônico, possui harness de testes comum com stubs e o build de produção ignora artefatos de teste sem falhar.

## Detalhes por componente

### Docker / Infra
- `docker-compose.yml`: healthchecks em Postgres/MinIO, dependências com `service_healthy`/`service_completed_successfully`; front-end sobe após o build e responde via nginx (porta 4200).
- `front-end/Dockerfile`: build multi-stage (Node 20 → dist, nginx Alpine) com `npm ci`, build e healthcheck por `curl`. `.dockerignore` evita enviar `node_modules`, `dist`, artefatos de IDE etc.

### Core API (Java/Spring)
- `CorsConfig` permite configurar origens via `app.cors.allowed-origins` (default `http://localhost:4200`, `http://127.0.0.1:4200`).
- `EmpresaController` normaliza o identificador (ID/CNPJ), busca o último `empresa_financeiro`, monta `features` reais e chama o ML para score/rede. A resposta inclui metadados utilizados, score, centralidades e nós/arestas agregados a partir da Base 2 (até 500 transações mais recentes).
- Entidades com `IDENTITY` usam `Long` (`ScoreRisco`, `Transacao`, `EmpresaFinanceiro`, `DecisaoCredito`); o campo `cnpj` é exposto e repositórios implementam `findByCnpj` e agregações de transação.
- Persistência de score grava `dtCalc`, `versao_modelo`, `threshold`, `auc_valid`, alinhando nomes às colunas do schema.

### ETL
- `etl/utils.py`: lê `DATABASE_URL`, usa `StaticPool` para SQLite e implementa upsert (Postgres) ou deleção + append para outros dialetos.
- `etl/etl_base1.py`: normaliza datas, filtra chaves obrigatórias, gera `cnpj` a partir do ID (pad/trim para 14 dígitos) e faz upsert em `empresa`/`empresa_financeiro`.
- `etl/etl_base2.py`: converte datas em formato Excel serial, garante numéricos em `vl`, limpa IDs e elimina registros inválidos antes de inserir em `transacao`.
- `run_all.py` executa Base 1 e Base 2 em sequência; `docker-compose.yml` faz `python run_all.py` no serviço ETL.
- Teste `etl/tests/test_etl_base1.py` usa SQLite para validar idempotência e atualização de saldo.

### ML Service
- `utils.get_engine()` aceita `DATABASE_URL` (Postgres/SQLite) e mantém fallback para variáveis individuais.
- `scoring.py` fixa a ordem de features (`idade`, `vl_fatu`, `vl_sldo`) antes da inferência, prevenindo quebras por DataFrame fora de ordem.
- Pytests executam com SQLite (`DATABASE_URL=sqlite:///ml_service_test.db`).

### Front-end Angular
- `DashboardComponent` cria identificador canônico (CNPJ de 14 dígitos ou ID `CNPJ_XXXXX`) antes de navegar e trata erros de score/rede.
- `ApiService.resolveEmpresaId()` tenta múltiplas representações (trim, upper, dígitos puros, prefixo `CNPJ_`) e consulta `/empresas` ou `/empresas/{id}` até encontrar uma correspondência.
- `src/test.ts` inicializa o ambiente de testes, injeta `HttpClientTestingModule`, sobrescreve `ApiService` com stub simples e neutraliza o render do `ChartComponent`; o script declara `beforeEach` de forma opcional para não quebrar o build de produção.
- Specs standalone importam `HttpClientTestingModule` quando necessário e evitam `fixture.detectChanges()` para componentes pesados de dashboard.
- `tsconfig.spec.json` referencia explicitamente `src/test.ts`; Angular CLI carrega `zone.js/testing` apenas durante testes.

## Testes executados
- Core API: `./mvnw test -q`
- ML Service: `DATABASE_URL=sqlite:///ml_service_test.db python -m pytest`
- ETL: `DATABASE_URL=sqlite:///etl_test.db python -m pytest`
- Front-end: `npm run test -- --watch=false --browsers=ChromeHeadless`
- Build front-end: `npm run build` (warning apenas de budget inicial > 500 kB)

## Pontos críticos / Considerações
- Healthchecks/dependências do Compose são necessários para evitar corrida entre ETL/trainer e Postgres.
- Ajuste `app.cors.allowed-origins` conforme URL pública; default atende desenvolvimento.
- Warning do Angular sobre budget (795 kB > 500 kB) é informativo; avalie otimizações se o limite for obrigatório.
- Arquivos binários (`PRD_Plataforma_Credito_PJ_PRODUCAO.docx`, `Regulamento_Challenge_Santander_4SI1.pdf`) permanecem apenas para referência, não versioná-los.

## Próximos passos sugeridos
1. Rodar `docker compose up --build` para validar toda a stack com o novo carregamento (`run_all.py`) e o front-end compilado.
2. Parametrizar credenciais e origens de CORS para ambientes além do local.
3. Se necessário, reduzir o bundle Angular ou ajustar o `budgets` da build.
