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

## Pré-requisitos

- Node.js ≥ 20 e pnpm ≥ 9
- Python ≥ 3.11
- Docker (para o container da FastAPI e Supabase local)
- Supabase CLI: `npm i -g supabase`

## Setup inicial

```bash
# 1. Clonar + env
cp .env.example .env
# Editar .env com suas credenciais

# 2. Instalar dependências
pnpm install
cd apps/api && pip install -e ".[dev]" && cd ../..

# 3. Subir Supabase local
supabase start   # imprime URL/anon_key/service_role; cole no .env

# 4. Aplicar migrations (após F1)
supabase db reset

# 5. Rodar web + api em dev
pnpm dev:web                        # http://localhost:5173
cd apps/api && uvicorn src.main:app --reload  # http://localhost:8000
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
| F1 | Identity + Workspace + Invites | ⏳ |
| F2 | Transactions unificadas | ⏳ |
| F3 | Cards + Parcelamento | ⏳ |
| F4 | Recurring + Cron | ⏳ |
| F5 | Investments + Debts | ⏳ |
| F6 | Dashboard + Charts | ⏳ |
| F7 | Audit + PDF + PWA | ⏳ |

## Contribuindo

Padrão: commits seguem Conventional Commits. PRs exigem CI verde (lint + test + RLS).
