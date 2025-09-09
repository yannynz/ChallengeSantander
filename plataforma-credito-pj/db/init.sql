-- Empresa (cadastro)
CREATE TABLE empresa (
  id TEXT PRIMARY KEY,
  cnpj CHAR(14),
  ds_cnae TEXT,
  dt_abrt DATE
);

-- Financeiro por referência (Base 1)
CREATE TABLE empresa_financeiro (
  id BIGSERIAL PRIMARY KEY,
  empresa_id TEXT REFERENCES empresa(id),
  dt_ref DATE NOT NULL,
  vl_fatu NUMERIC,
  vl_sldo NUMERIC,
  UNIQUE (empresa_id, dt_ref)
);

-- Transações (Base 2)
CREATE TABLE transacao (
  id BIGSERIAL PRIMARY KEY,
  id_pgto TEXT REFERENCES empresa(id),
  id_rcbe TEXT REFERENCES empresa(id),
  vl NUMERIC,
  ds_tran TEXT,
  dt_ref DATE NOT NULL
);

-- SNA métricas
CREATE TABLE centralidade_snapshot (
  id BIGSERIAL PRIMARY KEY,
  dt_calc DATE NOT NULL,
  empresa_id TEXT REFERENCES empresa(id),
  grau NUMERIC,
  betweenness NUMERIC,
  eigenvector NUMERIC,
  cluster_id INT
);

-- Score de risco
CREATE TABLE score_risco (
  id BIGSERIAL PRIMARY KEY,
  empresa_id TEXT REFERENCES empresa(id),
  dt_calc TIMESTAMP,
  modelo TEXT,
  score NUMERIC,
  auc_valid NUMERIC,
  threshold NUMERIC,
  versao_modelo TEXT
);

-- Decisões de crédito
CREATE TABLE decisao_credito (
  id BIGSERIAL PRIMARY KEY,
  empresa_id TEXT REFERENCES empresa(id),
  dt_decisao TIMESTAMP,
  score NUMERIC,
  aprovacao BOOLEAN,
  limite NUMERIC,
  moeda TEXT,
  motivo TEXT
);

