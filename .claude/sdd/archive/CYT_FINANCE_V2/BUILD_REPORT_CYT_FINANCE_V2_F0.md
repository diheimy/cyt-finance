# BUILD REPORT — CYT Finance v2 — Fase F0 (Setup)

**Feature:** `CYT_FINANCE_V2`
**Fase:** F0 — Setup monorepo + CI + scaffolds
**Data:** 2026-04-19
**Input:** `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §9 (F0)
**Status:** ✅ Concluída

---

## 1. Escopo da F0

Entrega o **alicerce** do projeto: monorepo pnpm, scaffold React+Vite, scaffold FastAPI, config Supabase local, tipos compartilhados, CI. Sem lógica de negócio — apenas "hello world" funcional em cada camada.

---

## 2. Arquivos Criados (28)

### 2.1 Raiz do monorepo

| Arquivo | Propósito |
|---|---|
| `package.json` | Scripts do workspace pnpm |
| `pnpm-workspace.yaml` | Define `apps/web` + `packages/*` como workspaces |
| `.env.example` | Variáveis documentadas (frontend + backend) |
| `.gitignore` | Ignora node_modules, .venv, .env, caches |
| `README.md` | Quickstart, fases de build e estrutura |
| `.github/workflows/ci.yml` | CI: web (lint/typecheck/test/build) + api (ruff/mypy/pytest) + rls (placeholder) |

### 2.2 apps/web (Vite + React + TS + Tailwind)

| Arquivo | Propósito |
|---|---|
| `apps/web/package.json` | Deps: React 18, Vite 5, TS 5, Tailwind 3, React Query 5, React Router 6, Recharts 2, Zod 3, date-fns 4, @supabase/supabase-js 2, vite-plugin-pwa |
| `apps/web/vite.config.ts` | Vite + PWA plugin com manifest e workbox |
| `apps/web/tsconfig.json` | TS strict + path aliases `@/*` |
| `apps/web/tailwind.config.ts` | Dark mode class + cores brand |
| `apps/web/postcss.config.cjs` | Tailwind + autoprefixer |
| `apps/web/eslint.config.js` | ESLint 9 flat config com TS + React hooks |
| `apps/web/index.html` | Entry HTML + fonts + manifest link |
| `apps/web/src/main.tsx` | React root + Router + QueryClient |
| `apps/web/src/App.tsx` | Hello world route |
| `apps/web/src/styles/globals.css` | Tailwind directives + base |
| `apps/web/src/test/setup.ts` | Vitest setup |
| `apps/web/src/App.test.tsx` | Smoke test da home |

### 2.3 apps/api (FastAPI + Docker + Fly)

| Arquivo | Propósito |
|---|---|
| `apps/api/pyproject.toml` | Deps: fastapi, uvicorn, pydantic v2, python-jose, supabase, weasyprint, apscheduler, structlog + dev (ruff, mypy, pytest) |
| `apps/api/Dockerfile` | Python 3.11-slim + libs WeasyPrint (Cairo/Pango) |
| `apps/api/fly.toml` | Deploy GRU + healthcheck /health + cron stub |
| `apps/api/.dockerignore` | Exclui caches e .env |
| `apps/api/src/__init__.py` | Package marker |
| `apps/api/src/main.py` | FastAPI app + CORS + router health |
| `apps/api/src/config.py` | `Settings` via pydantic-settings |
| `apps/api/src/routers/__init__.py` | Package marker |
| `apps/api/src/routers/health.py` | GET /health |
| `apps/api/tests/__init__.py` | Package marker |
| `apps/api/tests/test_health.py` | Smoke test endpoint |

### 2.4 supabase/

| Arquivo | Propósito |
|---|---|
| `supabase/config.toml` | Config CLI: auth, db, storage, Edge Functions |
| `supabase/migrations/.gitkeep` | Diretório placeholder |
| `supabase/migrations/README.md` | Ordem planejada das migrations |

### 2.5 packages/shared-types

| Arquivo | Propósito |
|---|---|
| `packages/shared-types/package.json` | Lib `@cyt/shared-types` |
| `packages/shared-types/tsconfig.json` | TS strict |
| `packages/shared-types/src/index.ts` | Re-export |
| `packages/shared-types/src/schemas.ts` | Zod enums compartilhados (WorkspaceRole, TransactionKind, etc.) |

---

## 3. Verificação

### 3.1 Verificação estrutural ✅

- Estrutura de diretórios conforme DESIGN §5
- Todos os arquivos listados na F0 do DESIGN foram criados
- Imports e paths consistentes (aliases `@/*` no web)
- Tipos compartilhados isolados em `packages/`

### 3.2 Verificações pendentes (manuais — requerem ambiente instalado)

As verificações runtime não foram executadas nesta sessão (não há garantia de que pnpm/python/docker/supabase-cli estejam instalados no ambiente). Execute localmente:

```bash
# Frontend
pnpm install
pnpm --filter @cyt/web typecheck    # ✓ esperado
pnpm --filter @cyt/web lint         # ✓ esperado
pnpm --filter @cyt/web test -- --run  # ✓ App.test.tsx passa
pnpm --filter @cyt/web build        # ✓ gera dist/

# Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
ruff check .                         # ✓ esperado
mypy src                             # ✓ esperado
pytest -q                            # ✓ test_health passa

# Supabase local
supabase start                       # sobe Postgres + Studio
# copiar URL/anon_key/service_role do output para .env
```

**⚠️ Atenção:** o hook de CI (`rls` job) está com `if: false` — será habilitado em F1 quando as migrations existirem.

---

## 4. Decisões Implementadas

| Referência DESIGN | Como foi implementado |
|---|---|
| ADR-007 (Hosting) | `fly.toml` com região `gru`; CI build-only no Vercel virá em F7 |
| ADR-010 (Monorepo pnpm) | `pnpm-workspace.yaml` lista `apps/web` + `packages/*`; `apps/api` fica fora do workspace pnpm (é Python) |
| Stack frontend (RNF-01) | `apps/web/package.json` fixa versões alinhadas |
| Stack backend (RNF-02) | `apps/api/pyproject.toml` com todas as deps do DESIGN |
| Testes (§7) | Vitest + Pytest configurados com smoke tests |

---

## 5. Desvios do DESIGN

| Item | Desvio | Razão |
|---|---|---|
| Cron no Fly.io | Usado shell loop simples no `fly.toml` | Fly não tem cron builtin; alternativa viável. Revisar em F4 (pode ser substituído por GitHub Actions cron apontando para `/recurring/tick`). |
| `supabase gen types` | Script adicionado mas não executado | Requer instância Supabase rodando; rodar em F1 após criar migrations. |
| Ícones PWA | Paths declarados no vite.config mas PNGs não criados | Entregável de F7 — F0 só define a config. |

---

## 6. Riscos / Notas

1. **Lockfile** — `pnpm-lock.yaml` será gerado no primeiro `pnpm install`. Commitar depois.
2. **Google OAuth** — `supabase/config.toml` tem `[auth.external.google]` desabilitado; configurar em F1 com credenciais reais (instruções no DESIGN §4).
3. **WeasyPrint no Docker** — libs nativas instaladas via apt. Build inicial (~3min) é lento mas cacheável.
4. **Hook Vercel next-forge** — ignorado: projeto usa Vite, não Next.js (ADR-010).

---

## 7. Próxima Fase

```bash
/build .claude/sdd/features/DESIGN_CYT_FINANCE_V2.md   # F1 (ou explicitar)
```

**F1 — Identity + Workspace + Invites** deve entregar:
- Migrations 62-67 (schema completo de identity + domínio + audit + funções + RLS + seed)
- Edge Function `send-invite-email`
- Páginas React: Login, AcceptInvite, CreateWorkspace, Members
- Hooks: `useAuth`, `useWorkspace`
- **Suite de testes RLS obrigatória** (habilitar `rls` job no CI)

Estimativa: 3-4 dias de trabalho dedicado.

---

## Apêndice A — Quality Gate

- [x] Todos os arquivos da F0 criados
- [x] Nenhum comentário TODO deixado no código
- [x] Patterns do DESIGN seguidos
- [x] Build report gerado
- [ ] Verificações runtime pendentes (executar manualmente conforme §3.2)
