## Ajustes pós-integração – build do front-end

### 1. Erros percebidos
Durante o build Docker do front-end (`npm run build`) surgiram duas classes de problemas:

1. **NG8102** – o template de `ImpactoComponent` usava `cliente.variacao ?? (...)`, mas o compilador sinalizou que o lado esquerdo não podia ser `null`/`undefined`.
2. **TS4111** – o template de `SimuladorComponent` acessava `dados.metadados?.fonte`. Como o tipo `SimuladorResponse` expunha `metadados` apenas com um index signature, o compilador obrigou o acesso via `['fonte']`.

Esses erros impediam o build de seguir para o estágio Nginx.

### 2. Causas-raiz

| Erro | Origem | Diagnóstico |
|------|--------|-------------|
| NG8102 | Utilização de `??` | O type checking estrito do Angular entende `variacao` como `number`, logo o operador era redundante e sinalizado como warn/erro no bundle. |
| TS4111 | TypeScript + template | A interface `SimuladorResponse` não declarava explicitamente `fonte`, apenas `gerado_em`. O compilador força acesso por `['fonte']` em campos inferidos de um index signature. |

### 3. Ajustes implementados

1. **ImpactoComponent**
   - Template passa a chamar `getVariacao(cliente)` para calcular a variação.
   - Método em `impacto.ts` retorna o valor informado ou calcula `limite_depois - limite_antes`.  
   - Mantém semântica original, mas elimina o operador `??` no template, atendendo à checagem do Angular.

2. **SimuladorResponse**
   - Interface em `shared/api.ts` ganhou o tipo `SimuladorMetadata`, com campos `gerado_em` e `fonte`.
   - `metadados` agora referencia esse tipo explícito, liberando o acesso via dot notation no template.

### 4. Testes executados

| Camada | Comando | Resultado |
|--------|---------|-----------|
| Front-end | `npm run build` | ✅ Bundle gerado (com warnings de budget já existentes) |
| Core API | `mvn test` | ✅ Suíte JUnit/Testcontainers concluída |
| Front-end (unitário) | `npm run test:ci` | ⚠️ Não executado; ambiente local sem Chrome/Chromium. (Instrução: instalar Chromium ou usar `npx playwright install --with-deps` antes de rodar) |
| ml_service | `pytest` | ⚠️ Não executado aqui; depende de Python 3.11 com wheels de pandas/shap. (Instrução: criar venv e instalar requirements antes) |

### 5. Conclusão

- O build falhou por incompatibilidades de **tipagem estática** introduzidas após enriquecer os contratos do storytelling.
- Ajustar o template de impacto e tipar corretamente `SimuladorResponse` foi suficiente para normalizar o pipeline.
- Após os ajustes, `npm run build` completou com sucesso, permitindo que o Dockerfile avance até o estágio final.
- A documentação (README e `docs/storytelling-real-data.md`) continua válida; este arquivo complementa com o histórico da correção.
