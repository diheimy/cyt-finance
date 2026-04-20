# CYT Finance v2

Gestão financeira pessoal e familiar — Supabase + FastAPI + React PWA.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui + React Query + Recharts |
| Backend | FastAPI (Python 3.11+) + WeasyPrint + supabase-py + APScheduler |
| Database | Supabase (Postgres + RLS + Auth + Storage) |
| Hosting | Vercel (web) + Fly.io/GRU (api) + Supabase managed |

## Documentação do projeto

- `/` Brainstorm: `.claude/sdd/features/BRAINSTORM_CYT_FINANCE_V2.md`
- `/` Requisitos: `.claude/sdd/features/DEFINE_CYT_FINANCE_V2.md`
- `/` Arquitetura + ADRs: `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md`
- `/` Relatórios de build: `.claude/sdd/reports/`

## Estrutura do monorepo

```
cyt-finance/
├── apps/
│   ├── web/                # React + Vite + PWA
│   └── api/                # FastAPI + Docker (não é workspace pnpm)
├── packages/
│   └── shared-types/       # Zod schemas + tipos compartilhados
├── supabase/
│   ├── migrations/         # SQL versionado
│   └── functions/          # Edge Functions (Deno)
└── .github/workflows/      # CI (lint + test + build + RLS)
```

## Portas reservadas (dev local)

Escolhidas para não conflitar com outros projetos Docker no mesmo host:

| Serviço | Porta | Observação |
|---|---|---|
| Web (Vite dev) | **5173** | padrão Vite |
| Web (preview) | **4173** | padrão Vite |
| API (FastAPI) | **8020** | `8000` ocupada (portainer) |
| Supabase Kong/API | **54341** | `54321` e `54331` em uso |
| Supabase Postgres | **54342** | |
| Supabase Studio | **54343** | |
| Supabase Inbucket (email de dev) | **54344** | |

Se alguma colidir com outra coisa no seu host, edite `supabase/config.toml` e `.env`.

## Pré-requisitos

- Node.js ≥ 20 (corepack embutido traz pnpm sem `npm i -g`)
- Python ≥ 3.11
- Docker
- Supabase CLI: `curl -sL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz -C ~/.local/bin/`

## Setup inicial

```bash
# 1. Clonar + env
cp .env.example .env
# editar .env com credenciais (service_role vem do `supabase start`)

# 2. Habilitar pnpm (Node 20+ traz corepack)
corepack enable --install-directory ~/.local/bin
corepack prepare pnpm@9.12.0 --activate

# 3. Instalar deps
pnpm install
cd apps/api && python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]" && cd ../..

# 4. Subir Supabase local (porta 54341-54344)
supabase start   # imprime anon_key + service_role; copie para .env

# 5. Aplicar migrations
supabase db reset

# 6. Rodar em dev
pnpm dev:web                                      # http://localhost:5173
docker compose -f docker-compose.dev.yml up -d    # API em http://localhost:8020/health
# OU nativo:
cd apps/api && .venv/bin/uvicorn src.main:app --reload --port 8020
```

## Scripts úteis

```bash
pnpm dev:web           # Servidor Vite
pnpm build:web         # Build produção
pnpm lint:web          # ESLint
pnpm typecheck:web     # tsc --noEmit
pnpm test:web          # Vitest
pnpm gen:types         # Gera tipos TS do schema Supabase
pnpm db:start          # Sobe Supabase local
pnpm db:reset          # Reaplica migrations
```

## Fases de build (AgentSpec SDD)

| Fase | Entrega | Status |
|---|---|---|
| F0 | Setup monorepo + CI | ✅ |
| F1 | Identity + Workspace + Invites (15 testes RLS) | ✅ |
| F2 | Transactions unificadas (14 testes unit) | ✅ |
| F3 | Cards + Parcelamento (7 testes SQL) | ✅ |
| F4 | Recurring + Cron (9 testes serviço+HTTP) | ✅ |
| F5 | Investments + Debts | ✅ |
| F6 | Dashboard + Charts (9 testes agregação) | ✅ |
| F7 | Audit + PDF + PWA (6 testes) | ✅ |

Ship final: `.claude/sdd/archive/CYT_FINANCE_V2/SHIPPED_2026-04-20.md`

## Status atual da verificação runtime

- ✅ `pnpm install` + typecheck + lint + test (26/26) + build
- ✅ Docker API build + `GET /health` OK
- ✅ pytest: 16 pass, 22 skip (dependem de Supabase local)

## Contribuindo

Padrão: commits seguem Conventional Commits. PRs exigem CI verde (lint + test + RLS).
