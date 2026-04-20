# DESIGN — CYT Finance v2

**Feature:** `CYT_FINANCE_V2`
**Data:** 2026-04-19
**Fase:** 2 — Design (AgentSpec SDD)
**Status:** ✅ Shipped (arquivado em 2026-04-20)
**Input:** `.claude/sdd/features/DEFINE_CYT_FINANCE_V2.md`

---

## 1. Visão Geral da Arquitetura

### 1.1 Diagrama C4 — Contexto

```
┌──────────────────────────────────────────────────────────────┐
│                         USUÁRIOS                             │
│   Ana (mobile PWA)        Bruno (desktop)     Convidados     │
└────────────┬─────────────────┬───────────────────┬───────────┘
             │                 │                   │
             ▼                 ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│               CYT FINANCE v2 (SISTEMA)                       │
│                                                              │
│  ┌────────────┐   ┌────────────┐   ┌────────────────────┐    │
│  │  Frontend  │──▶│  Supabase  │◀──│  FastAPI (Python)  │    │
│  │  (React)   │   │ (Auth+DB)  │   │  (jobs + PDF)      │    │
│  └─────┬──────┘   └─────┬──────┘   └─────────┬──────────┘    │
│        │                │                    │               │
│        └────────────────┴────────────────────┘               │
└──────────────────────────────────────────────────────────────┘
             │                 │                   │
             ▼                 ▼                   ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │  Vercel/CDN  │   │  Supabase    │   │  Fly.io ou   │
    │  (hosting)   │   │  managed     │   │  Render      │
    └──────────────┘   └──────────────┘   └──────────────┘
```

### 1.2 Diagrama C4 — Container

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND — React PWA (Vite + TS)                                       │
│                                                                         │
│   ┌────────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│   │ Pages/     │  │  Data Layer  │  │  UI Kit       │  │  Service     │ │
│   │ Routes     │──│  (React      │──│  (shadcn +    │  │  Worker      │ │
│   │ (RR v6)    │  │   Query +    │  │   Radix +     │  │  (PWA)       │ │
│   │            │  │   supabase-js│  │   Tailwind)   │  │              │ │
│   └────────────┘  └──────┬───────┘  └───────────────┘  └──────────────┘ │
│                          │                                              │
└──────────────────────────┼──────────────────────────────────────────────┘
                           │
              ┌────────────┴──────────────┐
              ▼                           ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  SUPABASE                    │  │  FASTAPI                     │
│                              │  │                              │
│  ┌──────────────────────┐    │  │  ┌────────────────────────┐  │
│  │ Auth (email+Google)  │    │  │  │ Router /reports/pdf    │  │
│  ├──────────────────────┤    │  │  ├────────────────────────┤  │
│  │ PostgREST (CRUD)     │    │  │  │ Router /recurring/tick │  │
│  ├──────────────────────┤    │  │  │  (cron-triggered)      │  │
│  │ Postgres + RLS       │    │  │  ├────────────────────────┤  │
│  │  ├─ profiles         │    │  │  │ Middleware JWT Auth    │  │
│  │  ├─ workspaces       │    │  │  │  (valida via Supabase) │  │
│  │  ├─ workspace_members│    │  │  ├────────────────────────┤  │
│  │  ├─ invites          │    │  │  │ supabase-py (service)  │  │
│  │  ├─ transactions     │    │  │  │ WeasyPrint             │  │
│  │  ├─ cards            │    │  │  │ APScheduler (alt: cron)│  │
│  │  ├─ categories       │    │  │  └────────────────────────┘  │
│  │  ├─ recurring        │    │  └──────────────────────────────┘
│  │  ├─ investments      │                │
│  │  ├─ debts            │                │ (chamadas com
│  │  └─ audit_logs       │                │  service_role key
│  ├──────────────────────┤                │  para jobs)
│  │ Storage (futuro)     │                │
│  └──────────────────────┘◀───────────────┘
└──────────────────────────────┘
```

### 1.3 Fluxos principais

| Fluxo | Caminho |
|---|---|
| **Login** | React → Supabase Auth → recebe JWT → armazena em cookies httpOnly (via SDK) |
| **CRUD normal** | React → `supabase.from('transactions').insert(...)` → PostgREST → RLS → Postgres |
| **Convite** | Owner cria via React → INSERT em `invites` → trigger Postgres → invoca Edge Function → envia email |
| **Export PDF** | React → `POST /reports/pdf` FastAPI (com JWT) → FastAPI valida JWT → query via service_role → WeasyPrint → retorna bytes |
| **Cron recurring** | Scheduler externo (Fly.io cron ou GitHub Actions) → `POST /recurring/tick` com secret header → FastAPI materializa |

### 1.4 Integration points

| Sistema | Propósito | Protocolo |
|---|---|---|
| Supabase Auth | Autenticação e sessão | HTTPS + JWT |
| Supabase PostgREST | CRUD do frontend | HTTPS REST |
| Supabase SMTP (ou Resend) | Email de convite | SMTP/API |
| FastAPI | PDF, jobs, agregações | HTTPS REST |
| Scheduler externo | Disparar cron recurring | HTTPS webhook |

---

## 2. Decisões Arquiteturais (ADRs inline)

### ADR-001 — Approach A: Supabase-heavy + FastAPI fino

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |
| **Origem** | Confirmado no `/brainstorm` (checkpoint 1) |

**Contexto:** A stack combina Supabase e FastAPI, que têm sobreposição funcional (ambos podem servir APIs de CRUD). Precisa-se de fronteira clara para evitar débito arquitetural.

**Escolha:** Supabase é a API primária (CRUD via PostgREST). FastAPI serve apenas endpoints que exigem Python: geração de PDF, job de recurring, agregações pesadas futuras, integrações externas (OFX).

**Rationale:**
- Elimina ~60% de código de CRUD (aproveita PostgREST + RLS)
- Auth, convites e Realtime (se futuro) ficam nativos
- Frontend usa cliente oficial `@supabase/supabase-js` — ergonomia superior
- FastAPI ganha papel claro e não vira SPOF

**Alternativas rejeitadas:**
1. **FastAPI como API principal** — reinventa Auth, convites, policies. Mais código, mais testes, mais bugs.
2. **Híbrido por domínio** — fronteira "simples vs complexo" é subjetiva, vira discussão eterna.

**Consequências:**
- ✅ Produtividade alta no MVP
- ⚠️ RLS é a linha primária de defesa → exige suite de testes de segurança obrigatória (ADR-005)
- ⚠️ Lógica SQL em PL/pgSQL para casos complexos (trigger, função de parcelamento)

---

### ADR-002 — Tabela `transactions` unificada

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** A v1 tem arrays separados `gastos`, `entradas`, `recorrentes`, `investimentos`. Cada um duplica lógica de CRUD, filtros e render.

**Escolha:** Unificar `gastos + entradas` em uma única tabela `transactions` com campo `tipo ∈ {gasto, entrada}`. Investimentos, dívidas e recurring ficam em tabelas separadas porque têm semântica distinta.

**Rationale:**
- Dashboard consulta uma tabela só (soma/filtro por tipo)
- Formulário compartilha ~80% da lógica
- Gráficos mensais se reduzem a `GROUP BY tipo, date_trunc('month', data)`

**Alternativas rejeitadas:**
1. **Manter tabelas separadas** — duplica queries, dashboard e triggers de audit
2. **Unificar tudo (investments e debts também)** — semântica diferente (parcelas pagas/total, pessoa credora) polui schema

**Consequências:**
- ✅ Menos código no frontend e backend
- ⚠️ Precisa de index em `(workspace_id, tipo, data)` para performance

---

### ADR-003 — Parcelamento como N linhas em `transactions`

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** Gasto parcelado em cartão pode ser 1 linha com array de parcelas OU N linhas, uma por parcela.

**Escolha:** **N linhas**. Cada parcela é uma `transaction` independente com `parcela_atual`, `parcelas_total`, `compra_id` (UUID compartilhado para agrupar).

**Rationale:**
- Query mensal (dashboard) é trivial: filtra por `data` da parcela
- Marcar parcela como "paga" é UPDATE em 1 linha
- Editar 1 parcela não afeta outras (ver RF-20)
- Filtros e relatórios por cartão/mês ficam simples (sem `UNNEST`)

**Alternativas rejeitadas:**
1. **1 linha + array JSON** — query mensal exige `jsonb_array_elements` → lento e esotérico
2. **Tabela `installments` separada** — JOIN extra em toda query; complexidade desnecessária

**Consequências:**
- ✅ Performance linear com índices
- ⚠️ Mais linhas no DB (mas R$ custo desprezível para app pessoal)
- ⚠️ Função SQL helper `create_installments(...)` para inserir N linhas atomicamente

---

### ADR-004 — Materialização de `recurring` via FastAPI cron

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** Recorrentes precisam virar `transactions` reais nas datas certas. Pode ser via: (a) trigger Postgres, (b) cliente materializa on-demand, (c) job externo.

**Escolha:** Job diário no FastAPI endpoint `POST /recurring/tick` disparado por scheduler externo (Fly.io cron ou GitHub Actions cron). Usa service_role key do Supabase para inserir.

**Rationale:**
- Testável com pytest
- Idempotente (chave: `recurring_id + data` — não duplica)
- Desacoplado do cliente (funciona mesmo sem ninguém abrir o app)
- Fly.io e Render têm cron built-in sem custo

**Alternativas rejeitadas:**
1. **Trigger Postgres com `pg_cron`** — Supabase gerenciado suporta, mas debug e visibilidade são piores
2. **Cliente materializa ao abrir o app** — frágil: se ninguém abrir, recorrente "esquece"; precisa lock otimista

**Consequências:**
- ✅ Lógica em Python tipado e testado
- ⚠️ Depende de scheduler externo (mitigação: health check + alarme)

---

### ADR-005 — RLS como linha primária de defesa + testes obrigatórios

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** RLS do Postgres é poderosa mas sutil. Um bug pode vazar dados entre famílias (crítico para app financeiro).

**Escolha:** RLS habilitada em 100% das tabelas de domínio. Para cada tabela, suite de testes integrados obrigatória que simula usuário de outro workspace e verifica:
- SELECT retorna array vazio
- INSERT/UPDATE/DELETE falha com 403 ou linha 0

**Rationale:**
- Single source of truth para autorização
- Testes pegam regressões (ex: alguém esquece de habilitar RLS em tabela nova)
- Aumenta confiança em refactors

**Alternativas rejeitadas:**
1. **Auth em middleware da app** — double implementation; bug no middleware = vazamento
2. **Sem testes formais de RLS** — risco inaceitável para dados financeiros

**Consequências:**
- ✅ Segurança enforced no DB
- ⚠️ CI deve rodar contra instância Supabase local (ou branch Supabase)
- ⚠️ Qualquer tabela nova exige teste RLS antes de merge (checklist PR)

---

### ADR-006 — FastAPI autentica via JWT do Supabase

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** FastAPI precisa identificar o usuário para gerar PDF privado e checar membership.

**Escolha:** Frontend envia `Authorization: Bearer <supabase_jwt>`. FastAPI valida localmente (chave pública do Supabase) e extrai `user_id` do claim `sub`. Para queries ao DB usa `service_role` + checa membership explicitamente antes de responder.

**Rationale:**
- Zero reinvenção de auth
- `jwt.decode()` com JWKS é simples em Python (`python-jose` ou `pyjwt`)
- Revogação funciona porque Supabase invalida JWT em logout
- Evita usar `anon` role via FastAPI (perderia identidade do usuário)

**Alternativas rejeitadas:**
1. **FastAPI chama `/auth/v1/user` a cada request** — latência extra
2. **Usar `anon` key + RLS** — FastAPI precisa passar JWT para Supabase → volta ao problema de propagar contexto; além disso perde o ganho de usar `service_role` para jobs

**Consequências:**
- ✅ Baixa latência (validação local)
- ⚠️ Precisa dependency injection que valide JWT e injete `user_id` em endpoints

---

### ADR-007 — Hosting: Supabase + Vercel + Fly.io

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** Precisa escolher onde hospedar cada camada para MVP.

**Escolha:**
- **Supabase managed** (projeto na free/pro tier): Auth + DB + Storage
- **Vercel**: Frontend (Vite build, edge network, PWA-friendly)
- **Fly.io**: FastAPI em container Docker; cron nativo; região São Paulo (GRU) disponível

**Rationale:**
- Todos têm **free tier** generosa para MVP
- Vercel faz deploy automático no push
- Fly.io tem região GRU (latência <30ms para usuários BR)
- WeasyPrint exige libs nativas (Cairo, Pango) → Docker resolve

**Alternativas rejeitadas:**
1. **Render** para FastAPI — ótimo, mas sem GRU; Fly é melhor para latência BR
2. **Netlify** para frontend — equivalente; Vercel é preferido pela DX do Next.js (mesmo usando Vite)
3. **AWS (Lambda + S3)** — overkill para MVP; complexidade desnecessária

**Consequências:**
- ✅ Todo stack gerenciado, zero ops
- ⚠️ Vendor lock parcial (aceitável no MVP; migração futura viável)

---

### ADR-008 — Convite via tabela `invites` + Edge Function (não `inviteUserByEmail`)

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** Supabase tem `auth.admin.inviteUserByEmail()`, mas ele cria usuário antes de aceitar convite e não vincula a workspace automaticamente.

**Escolha:** Tabela `invites` própria (`workspace_id`, `email`, `token`, `expires_at`, `accepted_at`). Trigger `AFTER INSERT` invoca **Edge Function** que envia email via Resend (ou SMTP padrão do Supabase). Link leva a página `/accept-invite?token=...` que:
1. Exige login (usuário cria conta se não tiver — ou faz login)
2. Chama RPC `accept_invite(token)` que verifica validade, adiciona a `workspace_members`, marca `accepted_at`

**Rationale:**
- Desacopla criação de conta da aceitação de convite
- Convite funciona para usuário já cadastrado (não precisa criar nova conta)
- Controle total sobre UX e emails

**Alternativas rejeitadas:**
1. **`auth.admin.inviteUserByEmail`** — cria auth.user sempre; fluxo estranho para usuário existente
2. **Código de convite via WhatsApp** — UX bacana mas exige mais código de claim; fora do MVP

**Consequências:**
- ✅ UX familiar ("você foi convidado para Família Silva")
- ⚠️ Exige 1 Edge Function + 1 RPC SQL + template de email

---

### ADR-009 — Recharts sobre Chart.js ou Visx

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** v1 usa Chart.js via CDN. v2 é React, então há opções nativas React.

**Escolha:** **Recharts**.

**Rationale:**
- API React idiomática (componentes)
- Bundle aceitável (~80KB gzip)
- Cobre 100% do que v1 faz (barras, rosca, linhas)
- Comunidade ampla, docs boas

**Alternativas rejeitadas:**
1. **Chart.js + react-chartjs-2** — imperativo, integração forçada
2. **Visx** (Airbnb) — mais poderoso mas curva alta; overkill
3. **Apache ECharts** — ótimo mas bundle maior

**Consequências:** Nenhum lock-in problemático; migração trivial se precisar.

---

### ADR-010 — pnpm + workspace monorepo

| | |
|---|---|
| **Status** | Accepted |
| **Data** | 2026-04-19 |

**Contexto:** Frontend e backend convivem no mesmo repo.

**Escolha:** Monorepo simples (não Turborepo) com:
```
cyt-finance/
├── apps/
│   ├── web/        (React + Vite)
│   └── api/        (FastAPI)
├── packages/
│   └── shared-types/  (TS types + Zod schemas compartilhados, gerados do schema Supabase)
├── supabase/
│   └── migrations/ (SQL versionado)
├── package.json    (pnpm workspace)
└── pyproject.toml  (em apps/api)
```

**Rationale:**
- Tipos TS gerados do Supabase (`supabase gen types typescript`) ficam num só lugar
- Scripts de dev podem iniciar tudo com `pnpm dev`
- Migrations versionadas em `supabase/migrations/` (CLI do Supabase)

**Alternativas rejeitadas:**
1. **Repos separados** — duplicação de tipos, CI complicado
2. **Turborepo/Nx** — overkill para 2 apps

**Consequências:** Simples; pode evoluir para Turborepo depois se crescer.

---

## 3. Modelo de Dados — Schema SQL Completo

### 3.1 Migrations (ordem)

```
supabase/migrations/
├── 20260419000001_identity.sql        # profiles, workspaces, members, invites
├── 20260419000002_domain.sql          # cards, categories, transactions, recurring, investments, debts
├── 20260419000003_audit.sql           # audit_logs + triggers
├── 20260419000004_functions.sql       # accept_invite, create_installments, materialize_recurring
├── 20260419000005_rls_policies.sql    # todas as RLS
├── 20260419000006_seed_categories.sql # categorias default ao criar workspace
```

### 3.2 Tabelas de identidade

```sql
-- 20260419000001_identity.sql

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE workspace_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'editor',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_members_user ON workspace_members(user_id);

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_token ON invites(token) WHERE accepted_at IS NULL;
```

### 3.3 Tabelas de domínio

```sql
-- 20260419000002_domain.sql

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ultimos_digitos TEXT NOT NULL CHECK (length(ultimos_digitos) = 4),
  dia_fechamento SMALLINT NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE category_kind AS ENUM ('gasto', 'entrada', 'investimento');

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo category_kind NOT NULL,
  cor TEXT,           -- hex
  icone TEXT,         -- nome do ícone (lucide)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, nome, tipo)
);

CREATE TYPE transaction_kind AS ENUM ('gasto', 'entrada');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tipo transaction_kind NOT NULL,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  descricao TEXT NOT NULL,
  data DATE NOT NULL,
  categoria_id UUID REFERENCES categories(id),
  cartao_id UUID REFERENCES cards(id),
  compra_id UUID,                    -- agrupa parcelas da mesma compra
  parcela_atual SMALLINT NOT NULL DEFAULT 1,
  parcelas_total SMALLINT NOT NULL DEFAULT 1,
  paga BOOLEAN NOT NULL DEFAULT TRUE, -- false quando é parcela futura de cartão
  recurring_id UUID,                  -- FK para recurring se materializada
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parcela_atual <= parcelas_total)
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
  categoria_id UUID REFERENCES categories(id),
  data_inicio DATE NOT NULL,
  limite_parcelas SMALLINT NOT NULL DEFAULT 0, -- 0 = infinito
  parcelas_materializadas SMALLINT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_ws_ativo ON recurring(workspace_id) WHERE ativo;

CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,  -- livre: renda fixa, renda variável, cripto, imóvel...
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
```

### 3.4 Auditoria

```sql
-- 20260419000003_audit.sql

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  acao TEXT NOT NULL,                 -- insert|update|delete
  entidade TEXT NOT NULL,             -- transactions|cards|...
  entidade_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_ws_created ON audit_logs(workspace_id, created_at DESC);

-- Função genérica de audit (aplicada por trigger em cada tabela)
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_ws UUID;
  v_user UUID := auth.uid();
BEGIN
  v_ws := COALESCE(NEW.workspace_id, OLD.workspace_id);
  INSERT INTO audit_logs (workspace_id, user_id, acao, entidade, entidade_id, payload)
  VALUES (
    v_ws,
    v_user,
    LOWER(TG_OP),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('new', to_jsonb(NEW), 'old', to_jsonb(OLD))
  );
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger em tabelas de domínio
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['transactions','cards','categories','recurring','investments','debts']) LOOP
    EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();', t, t);
  END LOOP;
END $$;
```

### 3.5 Funções de negócio

```sql
-- 20260419000004_functions.sql

-- Aceita convite: adiciona o usuário logado em workspace_members
CREATE OR REPLACE FUNCTION accept_invite(p_token TEXT)
RETURNS workspaces AS $$
DECLARE
  v_invite invites%ROWTYPE;
  v_ws workspaces%ROWTYPE;
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_invite FROM invites
    WHERE token = p_token AND accepted_at IS NULL AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_invite';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_invite.workspace_id, v_user, 'editor')
    ON CONFLICT DO NOTHING;

  UPDATE invites SET accepted_at = NOW() WHERE id = v_invite.id;

  SELECT * INTO v_ws FROM workspaces WHERE id = v_invite.workspace_id;
  RETURN v_ws;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria N parcelas de cartão respeitando dia de fechamento
CREATE OR REPLACE FUNCTION create_installments(
  p_workspace_id UUID,
  p_cartao_id UUID,
  p_valor_total NUMERIC(14,2),
  p_parcelas SMALLINT,
  p_descricao TEXT,
  p_categoria_id UUID,
  p_data_compra DATE
) RETURNS UUID AS $$
DECLARE
  v_compra UUID := gen_random_uuid();
  v_valor_parcela NUMERIC(14,2) := ROUND(p_valor_total / p_parcelas, 2);
  v_ultimo NUMERIC(14,2) := p_valor_total - (v_valor_parcela * (p_parcelas - 1));
  v_dia_fech SMALLINT;
  v_primeira_data DATE;
  i SMALLINT;
BEGIN
  SELECT dia_fechamento INTO v_dia_fech FROM cards
    WHERE id = p_cartao_id AND workspace_id = p_workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'card_not_found'; END IF;

  -- Se compra foi ANTES do fechamento, 1ª parcela vai para a próxima fatura (mês+1)
  -- Se foi DEPOIS, vai para fatura de mês+2 (comportamento de cartão)
  IF EXTRACT(DAY FROM p_data_compra) <= v_dia_fech THEN
    v_primeira_data := (date_trunc('month', p_data_compra) + INTERVAL '1 month')::DATE;
  ELSE
    v_primeira_data := (date_trunc('month', p_data_compra) + INTERVAL '2 months')::DATE;
  END IF;

  FOR i IN 1..p_parcelas LOOP
    INSERT INTO transactions (
      workspace_id, tipo, valor, descricao, data, categoria_id, cartao_id,
      compra_id, parcela_atual, parcelas_total, paga, created_by
    ) VALUES (
      p_workspace_id, 'gasto',
      CASE WHEN i = p_parcelas THEN v_ultimo ELSE v_valor_parcela END,
      p_descricao,
      (v_primeira_data + make_interval(months => i - 1))::DATE,
      p_categoria_id, p_cartao_id,
      v_compra, i, p_parcelas,
      FALSE,  -- parcelas de cartão começam "não pagas" até o pagamento da fatura
      auth.uid()
    );
  END LOOP;

  RETURN v_compra;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.6 RLS Policies

```sql
-- 20260419000005_rls_policies.sql

-- Helper function: é membro do workspace?
CREATE OR REPLACE FUNCTION fn_is_member(p_ws UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_ws AND user_id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_is_editor(p_ws UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_ws AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- profiles: usuário lê/edita o próprio
CREATE POLICY "profiles_self_read" ON profiles FOR SELECT USING (id = auth.uid() OR id IN (
  SELECT user_id FROM workspace_members WHERE workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
));
CREATE POLICY "profiles_self_write" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_self_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- workspaces: membros leem, só owner edita/deleta
CREATE POLICY "ws_member_read" ON workspaces FOR SELECT USING (fn_is_member(id));
CREATE POLICY "ws_owner_write" ON workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "ws_create" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ws_owner_delete" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- workspace_members: membros leem, só owner manipula
CREATE POLICY "wm_member_read" ON workspace_members FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "wm_owner_write" ON workspace_members FOR ALL USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- invites: owner do workspace cria e lê; aceite vai via RPC (não via POSTGREST)
CREATE POLICY "invites_owner_crud" ON invites FOR ALL USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- Padrão para tabelas de domínio
-- cards, categories, transactions, recurring, investments, debts
CREATE POLICY "dom_member_read" ON cards FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "dom_editor_write" ON cards FOR ALL USING (fn_is_editor(workspace_id));
-- ... mesmo padrão replicado para as demais tabelas (ver migração completa)

-- audit_logs: membros leem, ninguém escreve direto (só via trigger)
CREATE POLICY "audit_member_read" ON audit_logs FOR SELECT USING (fn_is_member(workspace_id));
-- sem policy de INSERT → trigger usa SECURITY DEFINER
```

### 3.7 Seed de categorias default

```sql
-- 20260419000006_seed_categories.sql

CREATE OR REPLACE FUNCTION seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (workspace_id, nome, tipo, cor, icone) VALUES
    (NEW.id, 'Alimentação', 'gasto', '#f59e0b', 'utensils'),
    (NEW.id, 'Transporte', 'gasto', '#3b82f6', 'car'),
    (NEW.id, 'Moradia', 'gasto', '#8b5cf6', 'home'),
    (NEW.id, 'Lazer', 'gasto', '#ec4899', 'smile'),
    (NEW.id, 'Saúde', 'gasto', '#ef4444', 'heart'),
    (NEW.id, 'Educação', 'gasto', '#14b8a6', 'book'),
    (NEW.id, 'Outros', 'gasto', '#64748b', 'more-horizontal'),
    (NEW.id, 'Salário', 'entrada', '#10b981', 'briefcase'),
    (NEW.id, 'Renda Extra', 'entrada', '#22c55e', 'plus-circle'),
    (NEW.id, 'Renda Fixa', 'investimento', '#0ea5e9', 'trending-up'),
    (NEW.id, 'Renda Variável', 'investimento', '#6366f1', 'activity'),
    (NEW.id, 'Cripto', 'investimento', '#f97316', 'bitcoin'),
    (NEW.id, 'Imóveis', 'investimento', '#84cc16', 'building');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seed_categories
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION seed_default_categories();
```

---

## 4. Contratos da API FastAPI

FastAPI expõe **apenas endpoints que precisam de Python** (ADR-001). Todos exigem JWT no header.

### 4.1 Endpoints

| Método | Path | Propósito | Auth |
|---|---|---|---|
| `GET` | `/health` | Healthcheck | - |
| `POST` | `/reports/pdf` | Gera PDF do relatório mensal | JWT usuário |
| `POST` | `/recurring/tick` | Cron: materializa recorrentes vencidas | X-Cron-Secret |
| `GET` | `/dashboard/aggregate?workspace_id=...&month=YYYY-MM` | Agregados complexos (opcional — pode ficar no SQL) | JWT usuário |

### 4.2 Shapes Pydantic

```python
# apps/api/schemas/reports.py
from datetime import date
from pydantic import BaseModel, Field
from uuid import UUID

class PdfReportRequest(BaseModel):
    workspace_id: UUID
    periodo_inicio: date
    periodo_fim: date
    incluir_graficos: bool = True
    incluir_auditoria: bool = False

class PdfReportResponse(BaseModel):
    filename: str
    content_type: str = "application/pdf"
    size_bytes: int
```

```python
# apps/api/schemas/recurring.py
class RecurringTickResponse(BaseModel):
    materialized_count: int
    skipped_count: int
    errors: list[str] = []
    ran_at: str
```

### 4.3 Dependency injection (auth)

```python
# apps/api/deps.py
from fastapi import Header, HTTPException, Depends
from jose import jwt, JWTError
import os

SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]
SUPABASE_URL = os.environ["SUPABASE_URL"]

class CurrentUser(BaseModel):
    id: UUID
    email: str

def current_user(authorization: str = Header(...)) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing_bearer")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
    except JWTError as e:
        raise HTTPException(401, f"invalid_jwt: {e}")
    return CurrentUser(id=payload["sub"], email=payload.get("email", ""))

def require_cron_secret(x_cron_secret: str = Header(...)) -> None:
    if x_cron_secret != os.environ["CRON_SECRET"]:
        raise HTTPException(403, "invalid_cron_secret")
```

### 4.4 Rota de PDF (esqueleto)

```python
# apps/api/routers/reports.py
from fastapi import APIRouter, Depends, Response
from ..deps import current_user
from ..services import pdf_service, supabase_service

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/pdf")
def generate_pdf(req: PdfReportRequest, user: CurrentUser = Depends(current_user)):
    if not supabase_service.is_member(req.workspace_id, user.id):
        raise HTTPException(403, "not_a_member")
    data = supabase_service.fetch_report_data(req.workspace_id, req.periodo_inicio, req.periodo_fim)
    pdf_bytes = pdf_service.render(data, include_charts=req.incluir_graficos)
    filename = f"cyt-finance-{req.periodo_inicio}-{req.periodo_fim}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
```

### 4.5 Cron recurring (esqueleto)

```python
# apps/api/routers/recurring.py
@router.post("/tick")
def recurring_tick(_: None = Depends(require_cron_secret)):
    result = recurring_service.materialize_due()
    return result
```

---

## 5. Manifest de Arquivos

### 5.1 Frontend (`apps/web/`)

| # | Arquivo | Ação | Propósito | Dependências |
|---|---|---|---|---|
| 1 | `apps/web/package.json` | Criar | Deps do frontend | - |
| 2 | `apps/web/vite.config.ts` | Criar | Config Vite + PWA plugin | 1 |
| 3 | `apps/web/tsconfig.json` | Criar | TS config | 1 |
| 4 | `apps/web/tailwind.config.ts` | Criar | Tailwind | 1 |
| 5 | `apps/web/index.html` | Criar | Entry HTML + manifest link | 2 |
| 6 | `apps/web/public/manifest.webmanifest` | Criar | PWA manifest | - |
| 7 | `apps/web/public/icons/{192,512,maskable}.png` | Criar | Ícones PWA | - |
| 8 | `apps/web/src/main.tsx` | Criar | Entry React | 1 |
| 9 | `apps/web/src/App.tsx` | Criar | Router + providers | 8 |
| 10 | `apps/web/src/lib/supabase.ts` | Criar | Client Supabase | 1 |
| 11 | `apps/web/src/lib/api.ts` | Criar | Client FastAPI (fetch com JWT) | 10 |
| 12 | `apps/web/src/lib/queryClient.ts` | Criar | React Query | 1 |
| 13 | `apps/web/src/types/database.ts` | Gerado | Tipos Supabase (`supabase gen types`) | schema |
| 14 | `apps/web/src/types/schemas.ts` | Criar | Zod schemas | 13 |
| 15 | `apps/web/src/hooks/useAuth.ts` | Criar | Hook sessão | 10 |
| 16 | `apps/web/src/hooks/useWorkspace.ts` | Criar | Workspace atual | 10 |
| 17 | `apps/web/src/hooks/useTransactions.ts` | Criar | CRUD transações | 10, 12 |
| 18 | `apps/web/src/hooks/useCards.ts` | Criar | CRUD cartões | 10, 12 |
| 19 | `apps/web/src/hooks/useRecurring.ts` | Criar | CRUD recurring | 10, 12 |
| 20 | `apps/web/src/hooks/useInvestments.ts` | Criar | CRUD investments | 10, 12 |
| 21 | `apps/web/src/hooks/useDebts.ts` | Criar | CRUD debts | 10, 12 |
| 22 | `apps/web/src/hooks/useAuditLogs.ts` | Criar | Query audit | 10, 12 |
| 23 | `apps/web/src/pages/Login.tsx` | Criar | Login email+google | 15 |
| 24 | `apps/web/src/pages/AcceptInvite.tsx` | Criar | Aceitar convite | 10, 15 |
| 25 | `apps/web/src/pages/CreateWorkspace.tsx` | Criar | Onboarding solo | 10, 15 |
| 26 | `apps/web/src/pages/Dashboard.tsx` | Criar | Cards + charts | 17, 18 |
| 27 | `apps/web/src/pages/Transactions.tsx` | Criar | Lista + busca | 17 |
| 28 | `apps/web/src/pages/Cards.tsx` | Criar | CRUD cartões | 18 |
| 29 | `apps/web/src/pages/Recurring.tsx` | Criar | CRUD recurring | 19 |
| 30 | `apps/web/src/pages/Investments.tsx` | Criar | CRUD | 20 |
| 31 | `apps/web/src/pages/Debts.tsx` | Criar | CRUD | 21 |
| 32 | `apps/web/src/pages/Audit.tsx` | Criar | Lista de logs | 22 |
| 33 | `apps/web/src/pages/Members.tsx` | Criar | Convites + papéis | 10 |
| 34 | `apps/web/src/pages/ReportExport.tsx` | Criar | Exportar PDF | 11 |
| 35 | `apps/web/src/components/ui/*` | Criar | shadcn/ui components | 4 |
| 36 | `apps/web/src/components/forms/TransactionForm.tsx` | Criar | Form gasto/entrada | 14, 17 |
| 37 | `apps/web/src/components/forms/InstallmentForm.tsx` | Criar | Form parcelado | 14, 18 |
| 38 | `apps/web/src/components/charts/MonthlyBars.tsx` | Criar | Recharts entradas/saídas | 17 |
| 39 | `apps/web/src/components/charts/LeakageDonut.tsx` | Criar | Vazamento de caixa | 17 |
| 40 | `apps/web/src/components/layout/AppShell.tsx` | Criar | Bottom nav mobile + sidebar desktop | - |
| 41 | `apps/web/src/components/workspace/WorkspaceSwitcher.tsx` | Criar | Alternar workspace | 16 |
| 42 | `apps/web/src/utils/format.ts` | Criar | Intl money + date-fns | - |
| 43 | `apps/web/src/sw.ts` | Criar | Service worker (via plugin) | 2 |

### 5.2 Backend (`apps/api/`)

| # | Arquivo | Ação | Propósito | Dependências |
|---|---|---|---|---|
| 44 | `apps/api/pyproject.toml` | Criar | Deps Python (fastapi, pydantic, python-jose, weasyprint, supabase, apscheduler) | - |
| 45 | `apps/api/Dockerfile` | Criar | Imagem com libs nativas (Cairo, Pango) | 44 |
| 46 | `apps/api/fly.toml` | Criar | Config Fly.io (região GRU + cron) | 45 |
| 47 | `apps/api/src/main.py` | Criar | App FastAPI + middlewares | 44 |
| 48 | `apps/api/src/deps.py` | Criar | `current_user`, `require_cron_secret` | 44 |
| 49 | `apps/api/src/schemas/reports.py` | Criar | Pydantic shapes | 44 |
| 50 | `apps/api/src/schemas/recurring.py` | Criar | Pydantic shapes | 44 |
| 51 | `apps/api/src/routers/health.py` | Criar | GET /health | 47 |
| 52 | `apps/api/src/routers/reports.py` | Criar | POST /reports/pdf | 48, 49, 53, 54 |
| 53 | `apps/api/src/services/supabase_service.py` | Criar | Client service_role + queries | 44 |
| 54 | `apps/api/src/services/pdf_service.py` | Criar | Renderiza HTML Jinja → WeasyPrint | 44 |
| 55 | `apps/api/src/routers/recurring.py` | Criar | POST /recurring/tick | 48, 50, 56 |
| 56 | `apps/api/src/services/recurring_service.py` | Criar | materialize_due() | 53 |
| 57 | `apps/api/src/templates/report.html.j2` | Criar | Template PDF | - |
| 58 | `apps/api/tests/test_jwt.py` | Criar | Testes de auth | 48 |
| 59 | `apps/api/tests/test_recurring.py` | Criar | Testes de materialização | 56 |
| 60 | `apps/api/tests/test_pdf.py` | Criar | Teste snapshot do PDF | 54 |

### 5.3 Supabase (`supabase/`)

| # | Arquivo | Ação | Propósito |
|---|---|---|---|
| 61 | `supabase/config.toml` | Criar | CLI config |
| 62 | `supabase/migrations/20260419000001_identity.sql` | Criar | Tabelas identidade |
| 63 | `supabase/migrations/20260419000002_domain.sql` | Criar | Tabelas domínio |
| 64 | `supabase/migrations/20260419000003_audit.sql` | Criar | Logs + triggers |
| 65 | `supabase/migrations/20260419000004_functions.sql` | Criar | RPCs |
| 66 | `supabase/migrations/20260419000005_rls_policies.sql` | Criar | Policies RLS |
| 67 | `supabase/migrations/20260419000006_seed_categories.sql` | Criar | Trigger de seed |
| 68 | `supabase/functions/send-invite-email/index.ts` | Criar | Edge Function envio email |
| 69 | `supabase/tests/rls_test.sql` | Criar | Testes RLS (pgTAP) |

### 5.4 Raiz do monorepo

| # | Arquivo | Ação | Propósito |
|---|---|---|---|
| 70 | `package.json` | Criar | pnpm workspace |
| 71 | `pnpm-workspace.yaml` | Criar | Lista apps/packages |
| 72 | `.env.example` | Criar | Variáveis documentadas |
| 73 | `.github/workflows/ci.yml` | Criar | CI: lint + test + build |
| 74 | `README.md` | Criar | Setup + run + deploy |
| 75 | `packages/shared-types/package.json` | Criar | Lib de tipos compartilhados |

**Total:** 75 arquivos no MVP completo (build será fatiado em 7 fases internas conforme DEFINE §5).

---

## 6. Padrões de Código (Copy-Paste Ready)

### 6.1 Frontend — Client Supabase

```typescript
// apps/web/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }
);
```

### 6.2 Frontend — Hook de CRUD (padrão)

```typescript
// apps/web/src/hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TransactionSchema, type Transaction } from '@/types/schemas';

export function useTransactions(workspaceId: string, month: string) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['transactions', workspaceId, month],
    queryFn: async () => {
      const [y, m] = month.split('-');
      const start = `${y}-${m}-01`;
      const end = new Date(+y, +m, 0).toISOString().slice(0, 10); // último dia do mês
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categoria:categories(*), cartao:cards(*)')
        .eq('workspace_id', workspaceId)
        .gte('data', start).lte('data', end)
        .order('data', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!workspaceId
  });

  const create = useMutation({
    mutationFn: async (input: Omit<Transaction, 'id' | 'created_at' | 'created_by'>) => {
      const parsed = TransactionSchema.parse(input);
      const { data, error } = await supabase.from('transactions').insert(parsed).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', workspaceId] })
  });

  return { list, create };
}
```

### 6.3 Frontend — Zod schema (validação de borda)

```typescript
// apps/web/src/types/schemas.ts
import { z } from 'zod';

export const TransactionSchema = z.object({
  workspace_id: z.string().uuid(),
  tipo: z.enum(['gasto', 'entrada']),
  valor: z.number().positive(),
  descricao: z.string().min(1).max(200),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoria_id: z.string().uuid().nullable(),
  cartao_id: z.string().uuid().nullable(),
  parcelas_total: z.number().int().min(1).max(60).default(1)
});

export type Transaction = z.infer<typeof TransactionSchema> & {
  id: string;
  parcela_atual: number;
  compra_id: string | null;
  paga: boolean;
  created_by: string;
  created_at: string;
};
```

### 6.4 Frontend — Format helpers

```typescript
// apps/web/src/utils/format.ts
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatMoney = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const formatDateBR = (iso: string) =>
  format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });

export const formatMonthYear = (iso: string) =>
  format(parseISO(iso), 'MMMM/yyyy', { locale: ptBR });
```

### 6.5 Backend — PDF service

```python
# apps/api/src/services/pdf_service.py
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML
from pathlib import Path

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"])
)

def render(data: dict, include_charts: bool = True) -> bytes:
    tpl = env.get_template("report.html.j2")
    html = tpl.render(**data, include_charts=include_charts)
    return HTML(string=html).write_pdf()
```

### 6.6 Backend — Recurring materialization

```python
# apps/api/src/services/recurring_service.py
from datetime import date
from .supabase_service import client

def materialize_due() -> dict:
    today = date.today()
    rules = client.table("recurring").select("*").eq("ativo", True).execute().data
    materialized, skipped, errors = 0, 0, []
    for rule in rules:
        try:
            already = (client.table("transactions")
                .select("id", count="exact")
                .eq("recurring_id", rule["id"])
                .eq("data", today.isoformat())
                .execute()).count or 0
            if already > 0:
                skipped += 1
                continue
            limit = rule["limite_parcelas"]
            done = rule["parcelas_materializadas"]
            if limit > 0 and done >= limit:
                skipped += 1
                continue
            client.table("transactions").insert({
                "workspace_id": rule["workspace_id"],
                "tipo": rule["tipo"],
                "valor": rule["valor"],
                "descricao": rule["descricao"],
                "data": today.isoformat(),
                "categoria_id": rule["categoria_id"],
                "recurring_id": rule["id"],
                "paga": True,
                "created_by": rule["created_by"]
            }).execute()
            client.table("recurring").update({
                "parcelas_materializadas": done + 1
            }).eq("id", rule["id"]).execute()
            materialized += 1
        except Exception as e:
            errors.append(f"{rule['id']}: {e}")
    return {"materialized_count": materialized, "skipped_count": skipped, "errors": errors, "ran_at": today.isoformat()}
```

### 6.7 Supabase Edge Function — Envio de email de convite

```typescript
// supabase/functions/send-invite-email/index.ts
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const { record } = await req.json(); // invite row do trigger
  const resendKey = Deno.env.get("RESEND_API_KEY")!;
  const appUrl = Deno.env.get("APP_URL")!;
  const link = `${appUrl}/accept-invite?token=${record.token}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "CYT Finance <noreply@cyt.finance>",
      to: record.email,
      subject: "Você foi convidado para um workspace no CYT Finance",
      html: `<p>Clique no link abaixo para aceitar o convite (válido por 7 dias):</p><p><a href="${link}">${link}</a></p>`
    })
  });
  return new Response("ok");
});
```

---

## 7. Estratégia de Testes

| Tipo | Escopo | Ferramentas | Cobertura |
|---|---|---|---|
| **Unit (backend)** | Funções isoladas (PDF render, recurring materialize, JWT parse) | pytest + respx | ≥70% |
| **Unit (frontend)** | Utils de format, schemas Zod | vitest | básica |
| **Integration (API)** | FastAPI endpoints com client de teste | pytest + TestClient | endpoints críticos |
| **RLS (obrigatório)** | Cada tabela com `workspace_id` | pgTAP (SQL nativo) OU pytest + supabase-py com JWT de 2 usuários | 100% das tabelas |
| **E2E (smoke)** | Fluxos críticos: login → criar ws → convidar → lançar transação → ver dashboard | Playwright | 3 fluxos |
| **PWA** | Instalabilidade + service worker | Lighthouse CI | score ≥ 90 |

### 7.1 Teste RLS — template obrigatório (pytest)

```python
# apps/api/tests/test_rls.py
import pytest
from supabase import create_client

@pytest.fixture
def clients():
    user_a = create_client(URL, ANON).auth.sign_in_with_password({"email": "a@t.com", "password": "..."})
    user_b = create_client(URL, ANON).auth.sign_in_with_password({"email": "b@t.com", "password": "..."})
    return user_a, user_b

def test_user_b_cannot_read_user_a_transactions(clients):
    a, b = clients
    tx_a = a.table("transactions").insert({...}).execute()
    got = b.table("transactions").select("*").eq("id", tx_a.data[0]["id"]).execute()
    assert got.data == []   # RLS bloqueia leitura

def test_user_b_cannot_insert_into_user_a_workspace(clients):
    _, b = clients
    with pytest.raises(Exception):  # RLS → 403
        b.table("transactions").insert({"workspace_id": WS_A, ...}).execute()
```

### 7.2 CI — pipeline GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request, push]
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm i --frozen-lockfile
      - run: pnpm --filter web lint
      - run: pnpm --filter web typecheck
      - run: pnpm --filter web test -- --run
      - run: pnpm --filter web build
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -e "apps/api[dev]"
      - run: cd apps/api && ruff check . && mypy .
      - run: cd apps/api && pytest -q
  rls:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db reset
      - run: pytest apps/api/tests/test_rls.py -q
```

---

## 8. Variáveis de Ambiente

```bash
# .env.example

# Frontend (VITE_ prefix é público)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://api.cyt.finance

# Backend FastAPI (nunca commitar)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=...        # para validar JWTs
CRON_SECRET=...                 # header X-Cron-Secret
RESEND_API_KEY=re_...           # envio de email (opcional)
APP_URL=https://cyt.finance

# Supabase local (dev)
# supabase start --ignore-health-check
```

---

## 9. Fatiamento em Fases Executáveis

Alinhado com DEFINE §5. Cada fase é um PR (ou série curta de PRs) com testes verdes.

| Fase | Nome | Entregáveis-chave | Deps | Duração estimada |
|---|---|---|---|---|
| **F0** | Setup monorepo + Supabase local + CI | Files 1-3, 44, 70-75; `supabase start` funcionando; CI verde com "hello world" | - | 1 dia |
| **F1** | Identity + Workspace + Invites | Migrations 62-67 + Edge Function 68; páginas 23-25, 33; hook 15-16; teste RLS de profiles/workspaces/members/invites | F0 | 3-4 dias |
| **F2** | Transactions (gasto + entrada) | Hook 17, página 27, form 36; teste RLS transactions | F1 | 2 dias |
| **F3** | Cards + Parcelamento | Hook 18, página 28, form 37, função SQL `create_installments` | F2 | 2 dias |
| **F4** | Recurring + Cron FastAPI | Hook 19, página 29, router 55 + service 56, schedule Fly.io | F2 | 2 dias |
| **F5** | Investments + Debts | Hooks 20-21, páginas 30-31 | F1 | 1-2 dias |
| **F6** | Dashboard + Charts | Página 26, componentes 38-39 | F2..F5 | 2 dias |
| **F7** | Audit + PDF + PWA | Hook 22, página 32, páginas 34, router 52 + service 54 + template 57, manifest 6 + ícones 7 + SW 43 | F6 | 2-3 dias |

**Total MVP:** ~14-18 dias dedicados.

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| RLS bug vaza dados | Crítico | Suite obrigatória (F1 já entrega); checklist PR |
| WeasyPrint falha em Fly.io | Médio | Docker com Cairo/Pango testado em F0 smoke |
| JWT validação falha por algoritmo | Médio | Usar segredo HS256 (Supabase padrão); testes em F1 |
| Parcelamento com dia de fechamento edge cases | Médio | Unit test da função SQL com múltiplos cenários em F3 |
| pnpm workspace + Python no mesmo CI | Baixo | Jobs separados; documentar em README |
| PWA iOS quirks | Baixo | Testar em Safari iOS desde F7; fallback sem install |

---

## 11. Próximos Passos

```bash
/build .claude/sdd/features/DESIGN_CYT_FINANCE_V2.md
```

O `/build` deve executar fase a fase (F0 → F7), gerando código + testes por fase, com relatório `BUILD_REPORT_CYT_FINANCE_V2.md`.

---

## Apêndice A — Quality Gate do Design

- [x] Diagrama de arquitetura claro (seção 1)
- [x] Decisões documentadas com rationale (seção 2 — 10 ADRs)
- [x] Manifest de arquivos completo (seção 5 — 75 arquivos)
- [x] Padrões de código copy-paste ready (seção 6)
- [x] Testing strategy cobre requisitos (seção 7, incluindo RLS)
- [x] Sem dependências circulares no manifest
