# Roteiro de Vídeo (8 minutos) — Plataforma Crédito PJ

> Storytelling: "CreditThink" é nossa copilota de crédito. Ao longo de 8 minutos vamos mostrar como transformamos dados brutos em decisões inteligentes para o segmento PJ.

## Overview rápido
- **Persona**: analistas de crédito e squad de inovação.
- **Mensagem-chave**: unimos dados transacionais, modelos de risco e UX moderna para aprovar crédito com segurança e velocidade.
- **Call to action final**: abrir caminho para produção e novos modelos (fraude, limite dinâmico).

## Linha do tempo e roteiro detalhado

### 00:00 – 00:45 · Abertura e problema
- **Cena**: câmera no apresentador + slide com logos Santander & CreditThink.
- **Falar**:
  - "Quando avaliamos crédito PJ, demoramos dias conectando planilhas, sistemas legados e modelos em notebooks."  
  - "Nossa plataforma unifica tudo em um cockpit só, com dados atualizados, modelos treinados e visualizações intuitivas."
- **Mostrar**: slide com bullet "Dados → Modelos → Insights".
- **Gancho criativo**: "Hoje quero guiar vocês pelo fluxo completo, como se seguíssemos o mesmo caminho que o dinheiro faz."

### 00:45 – 01:30 · Visão geral da solução
- **Cena**: trocar para um diagrama de alto nível.
- **Falar**:
  - "A jornada começa carregando dados via ETL, passa pelo Postgres, dispara modelos no nosso `ml_service`, expõe APIs spring e termina na SPA Angular."  
  - "Tudo sobe com `docker-compose`, sem dependências locais além do Docker."
- **Mostrar**: diagrama (usar na edição ou deixar no vídeo dividindo tela) como guia visual:

  ```mermaid
  flowchart LR
      Excel[(Bases XLSX)] --> ETL[ETL Pandas]
      ETL -->|run_all.py| Postgres[(Postgres)]
      Postgres -->|Feign + JPA| CoreAPI(Spring Boot)
      CoreAPI -->|chama| MLService(FastAPI ML)
      MLService -->|Score<br/>Forecast<br/>SNA| CoreAPI
      CoreAPI --> FrontEnd[Angular SPA]
      CoreAPI -->|export| API[REST /empresas, /decisoes, /macro]
      MLService <-- Trainer[Notebook → trainer.py]
      Trainer --> MinIO[(MinIO Models)]
  ```
- **Ponto chave**: reforçar que cada bloco está versionado neste repositório (`etl/`, `core-api/`, `ml_service/`, `front-end/`, `infra/`).

### 01:30 – 02:30 · Dados & ETL
- **Cena**: abrir VS Code/terminal com `etl/run_all.py` e `etl_base1.py`.
- **Falar**:
  - "Começamos ingestão com Pandas (arquivo `etl/etl_base1.py` e `etl_base2.py`)."  
  - "Normalizamos CNPJ, geramos chaves, persistimos via SQLAlchemy diretamente no Postgres."  
  - "O ETL é idempotente: usamos `upsert_dataframe` para evitar duplicados."  
  - "`run_all.py` orquestra as duas bases para rodar em container dedicado."
- **Mostrar**: snippet destacando `_normalize_cnpj` e `upsert_dataframe`.  
- **Call to action**: "Na demo, basta rodar `docker compose up etl` para reconstruir o banco a partir do Excel `Challenge FIAP - Bases.xlsx`."

### 02:30 – 03:30 · Modelos & ML-Service
- **Cena**: Mostrar terminal + `ml_service/main.py` aberto, depois `scoring.py` e `train_models.py`.
- **Falar**:
  - "Nosso serviço de ML é um FastAPI com quatro famílias de endpoints: score (`/ml/v1/score`), forecast ARIMA, SNA e macro."  
  - "`train_models.py` treina RandomForest e XGBoost usando dados do Postgres (idade da empresa, faturamento, saldo)."  
  - "Os modelos são serializados com Joblib e ficam em `ml_service/models/` — o container `trainer` pode ser acionado sempre que o dataset atualizar."  
  - "`scoring.py` abstrai fallback: se um modelo não está disponível, usa dummy > nunca quebra a cadeia."
- **Mostrar**: print do retorno `{"score": 0.82, "modelo": "RandomForest", "versao": "1.0.0"}`.
- **Criatividade**: "Pense nesse serviço como a torre de controle — é quem diz se o avião pode decolar ou precisa voltar para revisão."

### 03:30 – 04:30 · Core API (Spring Boot)
- **Cena**: abrir `core-api/src/main/java/...` e destacar controllers / services.
- **Falar**:
  - "`EmpresaController` resolve ID, busca histórico financeiro e chama o ML via `FeignClient` (`MlServiceClient`)."  
  - "Ao calcular score, salvamos o snapshot em `score_risco` para auditoria."  
  - "`/empresas/{id}/rede` monta grafo com transações (`TransacaoRepository`) e delega centralidades para o ML-Service."  
  - "`MacroController` agrega previsões macroeconômicas para exibir IPCA, SELIC, PIB."  
  - "`DecisaoController` registra decisões simuladas: útil para métricas do squad e alimentar BI."
- **Mostrar**: logging rico (`[SCORE]` no código) e highlight de `EmpresaResolverService` para explicar que aceitamos ID ou CNPJ.
- **Sugestão de demo técnica**: rodar `curl http://localhost:8080/empresas/1/score` para provar o fluxo ponta-a-ponta.

### 04:30 – 06:00 · Front-end (Angular + Material + vis-network)
- **Cena**: abrir a aplicação em `http://localhost:4200` (após `docker compose up`).
- **Falar** enquanto navega:
  1. **Login mockado** (`features/auth`): "Usamos `AuthService` simples com localStorage — suficiente para demo sem depender de IAM corporativo."  
  2. **Dashboard** (`features/dashboard`):  
     - Campo de busca (ID/CNPJ) usando Signals;  
     - Card de score com `ng-apexcharts` e histórico;  
     - Grafo de rede em tempo real com `vis-network`;  
     - Macro forecast comparando histórico e projeção (cores definidas em `macroColors`);  
     - Card "Resumo de Decisões" com barras para aprovações vs reprovações.  
  3. **Ações rápidas**: botões "Ver mais" levam para página detalhe com query params sincronizados.
- **Mostre no VS Code**: `dashboard.ts` com Signals (`computed`, `signal`) e `ApiService` centralizando chamadas REST.
- **Criatividade**: "Cada card funciona como um gauge de cockpit; se algo sair do esperado, você navega para a aba correspondente." 

### 06:00 – 07:15 · Detalhes da empresa & KPIs
- **Cena**: clicar em "Ver mais" → `empresa/:id`.
- **Falar**:
  - "Tabs `Score`, `Rede` e `Decisões` são componentes standalone."
  - "`TabScoreHistorico` reusa o endpoint de score para mostrar curva + data da última atualização."  
  - "`TabRede` redesenha o grafo conforme o ID resolvido (mesma lógica do dashboard, agora ampliada)."  
  - "`TabDecisoes` consome `/decisoes` e permite criar novas entradas (quando estiver conectado ao endpoint POST)."  
  - "Em `KpisComponent` temos indicadores agregados: total de análises, score médio, taxa de aprovação, limite médio."  
  - "Tudo com Angular Signals para estados reativos sem RxJS pesado."
- **Mostrar**: highlight de `kpis.ts` com `computed()` e `formatCurrency`, e `empresa-page.ts` gerenciando query params -> reforçar UX pensada para analistas.

### 07:15 – 08:00 · Encerramento + próximos passos
- **Cena**: voltar ao apresentador e slide final.
- **Falar**:
  - "Plataforma está dockerizada: `docker compose up --build` levanta Postgres, MinIO, ETL, trainer, ML e front."  
  - "Próximos passos sugeridos: 1) habilitar autenticação corporativa, 2) plugar scoring em limites reais, 3) versionar modelos no MinIO com governance."  
  - "Convidar o time para testar com cases reais e ajustar thresholds."  
  - "Obrigado — vamos escalar decisões de crédito com confiança e visibilidade em tempo real."
- **Fechar com CTA**: "Link do repositório, quadros de métricas e canal do squad para feedback." 

## Dicas práticas para gravar
- Faça `docker compose up --build` antes da gravação e aguarde healthchecks.
- Tenha requisições `curl` prontas (terminal visível) para provar latência baixa (<200ms local).
- Use zoom suave nas seções do VS Code para manter legibilidade em vídeo.
- Mantenha o ritmo: 8 minutos significa ~120 palavras por minuto — priorize verbos de ação e frases curtas.
- Se possível, insira lower-thirds com nome dos módulos enquanto fala (ex.: "ML-Service · FastAPI").

## Recursos de apoio
- `README.md`: endpoints principais.
- `docker-compose.yml`: visão da orquestração.
- `db/init.sql`: esquema relacional.
- `etl/tests/`: casos de teste para garantir normalização.
- `ml_service/tests/`: provas rápidas dos modelos.
- `front-end/src/app/shared/api.ts`: contrato único de consumo das APIs.

Boa gravação! 🧠⚡️
