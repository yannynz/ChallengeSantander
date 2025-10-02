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

## Atualizações recentes (26/set/2025)
- Permissão de execução do `core-api/mvnw` ajustada (`chmod +x mvnw`) e suíte `./mvnw test` executada com sucesso.
- Pytests do ETL (`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credito_pj ../venv/bin/python -m pytest`) passaram; a suíte do ML (`ml_service`) falhou ao inserir transações fictícias no Postgres devido a foreign key em `transacao`. Ainda não há seed de empresas correspondente.
- `npm test -- --watch=false --browsers=ChromeHeadless` executado sem falhas; `npm run build` gerou warning de budget (795 kB > 500 kB) mas produziu `dist/front-end`.
- Componentes Angular que utilizavam `takeUntilDestroyed()` foram atualizados para injetar `DestroyRef` (Dashboard, abas de Empresa e KPIs). Byte Order Marks residuais nos arquivos `tab-*.ts` foram removidos.
- `ApiService.resolveEmpresaId` segue retornando identificadores válidos; chamadas diretas `curl http://localhost:8080/empresas/CNPJ_00001/score` e `/rede` foram validadas.
- Testes E2E manuais com Playwright (Ctrl remoto) mostram login funcionando, mas a navegação para `/empresa/cnpj/CNPJ_00001` ainda acusa erro `NG0203` tanto no build de desenvolvimento quanto no build estático servido via `python3 -m http.server`. O 404 ao acessar diretamente a rota no build estático decorre da ausência de fallback SPA no servidor simples.
- Servidor HTTP temporário iniciado em `front-end/dist/front-end/browser` via `python3 -m http.server 4300`; testes encerrados posteriormente (pid não permaneceu ativo).

## Atualizações recentes (27/set/2025)
- Corrigida a origem do erro `NG0203` na rota de empresa: todos os componentes standalone relevantes (dashboard principal, página/abas de empresa e KPIs) passaram a receber `ApiService` e `DestroyRef` via injeção de construtor, eliminando uso de `inject()` fora de contexto válido durante criação em rotas lazy.
- `EmpresaPageComponent` passou a armazenar `ParamMap` em sinal tipado para uso reativo no template preservando leitura do `ActivatedRoute` apenas no construtor.
- Teste `ml_service/tests/test_sna.py` atualizado para criar empresas fictícias antes das transações, executar o cálculo de centralidade contra qualquer banco (`sqlite` ou Postgres real) e limpar os registros mesmo se a tabela não existir; garante compatibilidade com FK.
- Testes executados após ajustes:
  - Front-end: `npm test -- --watch=false --browsers=ChromeHeadless` (ok).
  - Front-end build: `npm run build` (warning de budget permanece, build concluído).
  - ML Service: `DATABASE_URL=sqlite:///ml_service_test.db ../venv/bin/python -m pytest` (ok, incluindo SNA).

## Atualizações recentes (28/set/2025)
- `ml_service/macro.py` ganhou cache híbrido (memória + persistência via tabela `macro_cache`), TTL configurável (`MACRO_CACHE_MINUTES`) e parametrização de timeout HTTP; testes cobrem reutilização do cache persistente.
- Novas APIs de macro suportam múltiplas séries agregadas e front-end (`DashboardComponent`) passou a consumir lote único via `getMacroSeries`, alinhando o overlay BACEN/IBGE descrito no PRD.
- `core-api`: `/empresas/{id}/score` agora recalcula os scores para todas as referências financeiras ingeridas da Base 1 (`empresa_financeiro`), produzindo séries temporais consistentes (`historico`, `historicoTimestamps`, `ultimaAtualizacaoScore`) e armazenando o snapshot mais recente em `score_risco`; `/decisoes` aceita filtro `empresaId`/`limit` e gera automaticamente uma nova decisão via `DecisaoService` quando não existe registro prévio para a empresa.
- `front-end`: abas de Empresa passaram a solicitar decisões filtradas e reaproveitam o histórico retornado pelo score para montar o gráfico de evolução; stubs de teste foram atualizados (score/histórico deixa de ficar vazio ao consultar qualquer CNPJ).
- Script `ml_service/prewarm_macro_cache.py` define a política recomendada de pré-aquecimento (executar diariamente às 05h BRT para SELIC/IPCA/PIB com horizonte de 6 meses e cache de 12h). Para ativar na produção, configurar `MACRO_CACHE_BACKEND=database`, `MACRO_CACHE_MINUTES=720` e agendar o script via cron/task runner.

## Atualizações recentes (29/set/2025)
- Investigação do fluxo "empresa → score → decisão" apontou que chamadas aos endpoints de decisão com CNPJ puro (`/decisoes?empresaId=000…`) não resolviam o identificador para o ID canônico (`CNPJ_00001`). Com isso, nenhuma decisão era registrada e o front-end exibia apenas o ponto atual (100%) por falta de histórico.
- Criado `EmpresaResolverService` centralizando a normalização de identificadores (ID, CNPJ mascarado/dígitos, sufixo). `EmpresaController` e `DecisaoService` passaram a utilizá-lo e `DecisaoController` agora resolve o ID antes de consultar/persistir registros.
- Adicionados testes cobrindo o cenário de consulta por CNPJ puro em `/decisoes`, garantindo que o serviço gere a decisão automaticamente mesmo quando o cliente não conhece o ID canônico.

## Atualizações recentes (30/set/2025)
- Adicionada semente automática de decisões (`DecisaoSeeder`) controlada por `credito.decisao.seed-on-startup` (default true no profile Docker). Na inicialização a API resolve empresas sem decisão e chama `DecisaoService.decidir`, evitando carga manual ao navegar na UI. Testes baseados em Spring Boot desabilitam a semente via `@TestPropertySource`.
- Identificado que o `ml_service` retornava a probabilidade do *mau* pagador (`classe = 1`) como `score`. A Core API e o front, contudo, tratavam o campo como probabilidade de aprovação, invertendo a lógica de crédito (maior risco ⇒ aprovação automática e histórico em 100%).
- Ajustado `ml_service/scoring.py` para calcular o score com a probabilidade da classe `0` (bom pagador) e manter a consistência numérica com o complemento do risco. A função agora seleciona o modelo disponível, normaliza o intervalo `[0,1]` e continua devolvendo `{score, modelo, versao}` para a API.
- Atualizado `tests/test_scoring.py` garantindo que o score permaneça dentro do intervalo válido. Reexecutados `DATABASE_URL=sqlite:///ml_service_test.db ../venv/bin/python -m pytest` (11 testes OK) e smoke tests manuais via `curl` em `/ml/v1/score`, `/empresas/{id}/score` e `/decisoes` demonstrando que empresas com saldo negativo passam a ser reprovadas.
- `front-end/src/app/features/empresa/tabs/tab-score-historico/tab-score-historico.ts` passou a mesclar o histórico mensal retornado pela Core API (`historico`/`historicoTimestamps`) com as decisões persistidas, forçando ordenação cronológica, e agora fixa eixos (0–100%), marcadores e categorias para que o gráfico não fique vazio quando o score é 0%. `npm run build` recompilou o bundle (warning de budget permanece).

## Atualizações recentes (01/out/2025)
- `ApiService` agora resolve dinamicamente a base do backend: usa `window.__API_BASE_URL__` quando presente, mantém `http://localhost:8080` para hosts locais/loopback (IPv4 e IPv6) e, em ambientes servidos por nginx, assume `${origin}/api`; durante SSR (Node) o fallback continua apontando para `http://core-api:8080`.
- A aba "Score / Histórico" passou a tratar falhas no cálculo do ML; quando `/empresas/{id}/score` retorna erro, o gráfico é reconstruído só com decisões persistidas e a mensagem de ausência aparece apenas se nenhum ponto for encontrado. O estado visual volta ao padrão ao trocar de empresa.
- Configuração do nginx do front adicionou proxy reverso em `/api/` para `core-api:8080`, permitindo que o browser utilize a mesma origem do front dentro dos containers Docker.
- `DecisaoSeeder` deixou de abrir transação para todo o seed. Cada chamada a `DecisaoService.decidir` continua transacional, mas exceções individuais não marcam mais o runner como rollback-only, eliminando o `UnexpectedRollbackException` no boot quando alguma empresa não possui dados financeiros suficientes. O `application.yml` agora define `credito.decisao.seed-on-startup=false` por padrão; para pré-carregar decisões é preciso habilitar explicitamente a flag.

## Pendências/validações futuras
1. Reexecutar a suíte do ML Service apontando para Postgres para validar o cenário com FKs reais (`DATABASE_URL=postgresql://...`).
2. Repassar o fluxo Playwright/navegador para `/empresa/cnpj/...` tanto no `ng serve` quanto no build estático garantindo que o erro NG0203 não ocorre mais.
3. (opcional) Se for necessário publicar build estático sem 404 em rotas diretas, configurar servidor com fallback SPA (ex.: nginx com `try_files`).
