# Storytelling Insights - Plano de Integracao com Dados Reais

## Visao Geral
- **Contexto atual:** as rotas `/api/impacto`, `/api/explain/{id}`, `/api/metrics` e `/api/simulador` expostas pelo `ml_service` retornam dados mockados que alimentam o painel de storytelling no front-end Angular.
- **Objetivo de negocio:** conectar os insights do storytelling a dados reais (Postgres, modelos treinados, logs de decisao) preservando clareza narrativa, rastreabilidade e velocidade de resposta.
- **Objetivo tecnico:** evoluir a arquitetura existente, substituindo mocks por pipelines produtivas, com testes, observabilidade e plano de rollout seguro.

## Escopo Funcional (PRD)
### 1. Impacto de Negocio
- **Descricao:** demonstrar ganhos de limite, aprovacoes e influencia em rede para clientes selecionados.
- **Fonte de dados:** tabelas de decisoes de credito (Postgres), scores gerados pelo `ml_service`, grafo em `sna.py` ou camada analitica equivalente.
- **Requisitos:**
  - Selecionar um conjunto curado de clientes (ex.: top N por variacao de limite) ou permitir filtros dinamicos.
  - Calcular comparativo `limite_antes` vs `limite_depois` com base nas decisoes registradas.
  - Extrair metricas de centralidade reais da rede financeira (orquestrar chamada a `ml_service`/SNA com dados do cliente).
  - Garantir SLA < 2s por chamada (caching recomendado).

### 2. Explicabilidade
- **Descricao:** expor fatores reais provenientes de SHAP (ou equivalente) para cada cliente.
- **Fonte de dados:** arquivos/modelos salvos no bucket MinIO ou tabela de explicabilidade (caso exista), scripts de score (`scoring.py`) com suporte a SHAP.
- **Requisitos:**
  - Disponibilizar explainers treinados (TreeExplainer ou KernelExplainer) para cada modelo considerado.
  - Persistir contribuicoes principais (top features, impacto numerico) para reuso e auditoria.
  - Habilitar modo degenerado com thresholds (ex.: cliente sem dados -> mensagem clara).

### 3. Metricas de Modelo
- **Descricao:** exibir metricas de validacao e monitoramento coletadas via pipeline de MLOps.
- **Fonte de dados:** `metrics.json` gerado pelo `validation.py`, logs de treino, tabela de monitoramento ou ferramenta externa (MLflow, Evidently).
- **Requisitos:**
  - Automatizar execucao de `validation.py` (ou pipeline equivalente) no CI/CD ou cron, escrevendo resultados em storage padronizado (MinIO, Postgres, S3).
  - Incluir metricas de drift, estabilidade e historico temporal (AUC, KS, PSI).
  - Expor ultima data de atualizacao e fonte de dados para auditoria.

### 4. Simulador de Credito
- **Descricao:** simular cenarios com base em regressao/motor de decisao real.
- **Fonte de dados:** modelos de score operacionais (ex.: regressao logistica, XGBoost), parametros de negocio (limites, faixas de risco).
- **Requisitos:**
  - Calcular score com modelo real (chamada ao `ml_service` existente com features sintetizadas do formulario).
  - Transformar score em faixa de risco usando as regras de negocio documentadas.
  - Estimar limite sugerido com base em politicas vigentes (ex.: funcoes piecewise, tiers por segmento).
  - Logar cada simulacao para auditoria (usuario, parametros, retorno).

## Fluxo de Dados Proposto
```
Front-end Angular -> core-api (Spring) -> ml_service (FastAPI) -> Postgres / Modelos / MinIO
                                   ^                                |
                                   |-- cache/stream metrics --------|
```
- `core-api` continua orchestrador entre front-end e `ml_service`.
- `ml_service` passa a consultar fontes reais (via SQLAlchemy, pandas, modelos carregados).
- Cache em Redis/SQLite opcional para rotas de storytelling com alta demanda.

## Atualizacoes Backend Planejadas
1. **ml_service**
   - Criar camadas de repositorio para Postgres (SQLAlchemy, consultas otimizadas).
   - Implementar modulo SHAP real (carregar modelos em `models/`, gerar explicadores e persistir contribuicoes).
   - Ajustar `validation.py` para consumir dados reais, salvar metricas em MinIO/DB, gerar snapshots versionados.
   - Adicionar testes integrados com banco (usando fixtures ou sqlite in-memory).

2. **core-api**
   - Estender `InsightsService` com DTOs tipados e validacoes (ex.: MapStruct/records).
   - Incluir caching (ex.: Caffeine) para metricas e impacto.
   - Criar handlers de erros especificos (408 para timeouts, 502 para Falha ML, etc.).

## Atualizacoes Frontend Planejadas
- Ajustar `ApiService` para lidar com paginação/filtros futuros.
- Incluir estados de carregamento/erro refinados (spinners, retry).
- Exibir metadados reais (data de atualizacao, volume analisado).
- Considerar feature flags para alternar entre mock e real (ex.: via environment.ts).

## Qualidade e Observabilidade
- **Testes:** unitarios (pytest/JUnit), integracao (testcontainers), End-to-End (Playwright).
- **Logs e Metrics:** padronizar logs estruturados, expor Prometheus metrics (tempo de resposta, cache hits).
- **Alertas:** configurar alertas no CI/CD (falha no pipeline, metricas fora de range).

## Rollout e Roadmap
1. **Fase 0:** preparar dados (garantir ETL, views SQL, modelos salvos).
2. **Fase 1:** substituir `/api/metrics` por dados reais (menor risco).
3. **Fase 2:** integrar `/api/impacto` com limites reais.
4. **Fase 3:** disponibilizar explicabilidade via SHAP real.
5. **Fase 4:** ativar simulador com modelo real e logging.
6. **Fase 5:** monitorar performance, coletar feedback, iterar UI/UX.

## Riscos e Mitigacoes
- **Latencia elevada:** usar cache ou precomputacao.
- **Dados lacunares:** fallback para mensagens claras; feature flags para mock.
- **Drift/fora do padrao:** monitoramento continuo + alertas.
- **Compliance:** revisar LGPD, manter consentimento e mascaramento de dados sensiveis.

## Prompt Recomendado para Agente de IA
```
Voce e um desenvolvedor senior atuando no repositorio ChallengeSantander. Migramos as rotas de storytelling (/api/impacto, /api/explain/{id}, /api/metrics, /api/simulador) de mocks para dados reais. Siga os requisitos:
- Conectar ml_service a Postgres usando SQLAlchemy, recuperando decisoes, limites e grafo de influencia.
- Carregar modelos reais salvos em ml_service/models, gerar explicabilidade com SHAP (TreeExplainer) ou fallback documentado.
- Atualizar validation.py para calcular metricas com dados reais, salvar em metrics.json versionado (MinIO ou filesystem) e retornar metadados ao front.
- Ajustar core-api (InsightsService/Controller) com DTOs bem definidos, tratamento de erros e caching quando necessario.
- Atualizar Angular (ApiService + componentes de storytelling) para exibir os novos campos, estado de carregamento, alerta quando dados nao estiverem disponiveis e manter acessibilidade.
- Incluir testes unitarios/integrados, ajustar CI para executar a suite e validar migrations/dados seed.
- Garantir compatibilidade com docker-compose up e documentar no README passos para ativar dados reais (feature flag se preciso).

Nao escreva codigo temporario sem testes. Sempre explique alteracoes complexas em comentarios pontuais. Priorize clareza, rastreabilidade e seguranca dos dados.
```

## Proximos Passos
- Validar disponibilidade de dados reais (ETL concluido, modelos atualizados).
- Confirmar requisitos de negocio com stakeholders (quais clientes, limites, definicoes de risco).
- Planejar sprint com milestones e critérios de aceite.
