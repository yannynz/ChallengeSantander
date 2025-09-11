Boa! 🎉 Agora que você já tem os controllers em **Spring Boot** configurados, sim, já dá pra testar o Java — desde que o banco esteja populado (via ETL) e o `ml_service` esteja rodando para responder às chamadas de score/rede/forecast.

Vou organizar os endpoints disponíveis e como você pode testá-los:

---

# 🚀 Endpoints e Testes

## 1. Decisões de Crédito

**Controller**: `DecisaoController`
**Path base**: `/decisoes`

### ➡️ Criar decisão

```bash
curl -X POST http://localhost:8080/decisoes \
  -H "Content-Type: application/json" \
  -d '{
    "empresaId": 1,
    "descricao": "Aprovado",
    "valor": 5000
  }'
```

### ➡️ Listar decisões

```bash
curl http://localhost:8080/decisoes
```

---

## 2. Empresas

**Controller**: `EmpresaController`
**Path base**: `/empresas`

### ➡️ Listar empresas

```bash
curl http://localhost:8080/empresas
```

### ➡️ Buscar empresa por ID

```bash
curl http://localhost:8080/empresas/1
```

### ➡️ Calcular score de risco

Esse endpoint chama o `ml_service` (random forest, `modelo=rf`) e grava o resultado na tabela `score_risco`.

```bash
curl http://localhost:8080/empresas/1/score
```

Resposta esperada (exemplo):

```json
{
  "score": 0.82,
  "modelo": "rf",
  "versao": "1.0.0"
}
```

### ➡️ Calcular rede (centralidades)

```bash
curl http://localhost:8080/empresas/1/rede
```

Resposta esperada (exemplo, depende do `ml_service`):

```json
{
  "centralidades": {
    "1": 0.55,
    "200": 0.45
  }
}
```

---

## 3. Macro

**Controller**: `MacroController`
**Path base**: `/macro`

### ➡️ Forecast de série temporal

```bash
curl "http://localhost:8080/macro?serie=faturamento&from=2020-01-01"
```

Resposta esperada (exemplo):

```json
{
  "forecast": [140, 150, 160]
}
```

---

# 🟢 Pré-requisitos para funcionar

1. **Postgres** rodando e populado (ETL precisa ter rodado).
2. **ml\_service** disponível em `http://credito_ml_service:8000` (conforme está configurado no `MlServiceClient`).
3. **core\_api** rodando na porta **8080** (já aparece nos logs do Tomcat).


