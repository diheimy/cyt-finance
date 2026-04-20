-- ─────────────────────────────────────────────────────────────
-- F1 — Domínio financeiro (tabelas criadas agora; features virão em F2-F5)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ultimos_digitos TEXT NOT NULL CHECK (length(ultimos_digitos) = 4),
  dia_fechamento SMALLINT NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_workspace ON cards(workspace_id);

CREATE TYPE category_kind AS ENUM ('gasto', 'entrada', 'investimento');

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo category_kind NOT NULL,
  cor TEXT,
  icone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, nome, tipo)
);

CREATE INDEX idx_categories_workspace ON categories(workspace_id);

CREATE TYPE transaction_kind AS ENUM ('gasto', 'entrada');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tipo transaction_kind NOT NULL,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  descricao TEXT NOT NULL,
  data DATE NOT NULL,
  categoria_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  cartao_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  compra_id UUID,
  parcela_atual SMALLINT NOT NULL DEFAULT 1,
  parcelas_total SMALLINT NOT NULL DEFAULT 1,
  paga BOOLEAN NOT NULL DEFAULT TRUE,
  recurring_id UUID,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parcela_atual <= parcelas_total),
  CHECK (parcelas_total >= 1)
);

CREATE INDEX idx_tx_ws_tipo_data ON transactions(workspace_id, tipo, data DESC);
CREATE INDEX idx_tx_ws_data ON transactions(workspace_id, data DESC);
CREATE INDEX idx_tx_compra ON transactions(compra_id) WHERE compra_id IS NOT NULL;
CREATE INDEX idx_tx_recurring ON transactions(recurring_id) WHERE recurring_id IS NOT NULL;

CREATE TABLE recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tipo transaction_kind NOT NULL,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  descricao TEXT NOT NULL,
  categoria_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  data_inicio DATE NOT NULL,
  limite_parcelas SMALLINT NOT NULL DEFAULT 0,
  parcelas_materializadas SMALLINT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_ws_ativo ON recurring(workspace_id) WHERE ativo;

-- FK pendente de transactions para recurring
ALTER TABLE transactions
  ADD CONSTRAINT fk_tx_recurring FOREIGN KEY (recurring_id) REFERENCES recurring(id) ON DELETE SET NULL;

CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  data DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_ws_data ON investments(workspace_id, data DESC);

CREATE TYPE debt_kind AS ENUM ('receber', 'pagar');

CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tipo debt_kind NOT NULL,
  pessoa TEXT NOT NULL,
  valor_total NUMERIC(14,2) NOT NULL CHECK (valor_total > 0),
  parcelas_total SMALLINT NOT NULL CHECK (parcelas_total >= 1),
  parcelas_pagas SMALLINT NOT NULL DEFAULT 0 CHECK (parcelas_pagas >= 0),
  descricao TEXT,
  data_inicio DATE NOT NULL,
  quitada_em TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parcelas_pagas <= parcelas_total)
);

CREATE INDEX idx_debts_ws ON debts(workspace_id);
