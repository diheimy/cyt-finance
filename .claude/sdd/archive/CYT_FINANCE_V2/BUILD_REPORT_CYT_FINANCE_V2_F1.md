# BUILD REPORT — CYT Finance v2 — Fase F1 (Identity + Workspace + Invites)

**Feature:** `CYT_FINANCE_V2`
**Fase:** F1
**Data:** 2026-04-20
**Input:** `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §9 (F1)
**Status:** ✅ Concluída

---

## 1. Escopo da F1

Camada de identidade completa + schema relacional completo (domínio + audit) com RLS end-to-end e suite de testes obrigatória.

**Entregues:**
- Migrations SQL (6 arquivos) — schema completo, RPCs, RLS, seed
- Edge Function `send-invite-email` (Deno + Resend)
- Client Supabase tipado + hooks (`useAuth`, `useWorkspace`, `useCreateWorkspace`, `useAcceptInvite`)
- Páginas: Login (email/senha + Google), CreateWorkspace, AcceptInvite, Members, AuthCallback, Home
- RouteGuards (RequireAuth, RequireAnon)
- Suite de testes RLS obrigatória (pytest)
- CI RLS job habilitado

**Coberto do DESIGN:** RF-01..10 (identity + workspaces + convites), RNF-04, RNF-05, SNF-01 (isolamento).

---

## 2. Arquivos criados/modificados (20)

### 2.1 Supabase (migrations + Edge Function)

| Arquivo | Linhas | Propósito |
|---|---|---|
| `supabase/migrations/20260420000001_identity.sql` | ~70 | profiles, workspaces, members, invites + triggers de bootstrap |
| `supabase/migrations/20260420000002_domain.sql` | ~100 | cards, categories, transactions, recurring, investments, debts |
| `supabase/migrations/20260420000003_audit.sql` | ~45 | audit_logs + trigger genérico `fn_audit_trigger` |
| `supabase/migrations/20260420000004_functions.sql` | ~85 | fn_is_member, fn_is_editor, fn_is_owner, accept_invite, create_installments |
| `supabase/migrations/20260420000005_rls_policies.sql` | ~100 | RLS habilitada em 11 tabelas + policies (read member / write editor / admin owner) |
| `supabase/migrations/20260420000006_seed_categories.sql` | ~30 | 13 categorias default ao criar workspace |
| `supabase/functions/send-invite-email/index.ts` | ~75 | Dispara email via Resend; modo dev imprime link |
| `supabase/tests/README.md` | — | Documentação de como rodar RLS tests |

### 2.2 Web (React + TS)

| Arquivo | Propósito |
|---|---|
| `apps/web/src/lib/supabase.ts` | Client Supabase com PKCE + types |
| `apps/web/src/types/database.ts` | Tipos placeholder (substituir via `supabase gen types` após F1) |
| `apps/web/src/hooks/useAuth.ts` | `signInWithPassword`, `signUpWithPassword`, `signInWithGoogle`, `signOut`, `resetPassword` |
| `apps/web/src/hooks/useWorkspace.ts` | `useWorkspaces`, `useActiveWorkspace`, `useCreateWorkspace`, `useAcceptInvite` |
| `apps/web/src/components/RouteGuard.tsx` | `RequireAuth` + `RequireAnon` |
| `apps/web/src/pages/Login.tsx` | Email/senha + Google + alternância signin/signup |
| `apps/web/src/pages/CreateWorkspace.tsx` | Onboarding solo (cria workspace + adiciona owner) |
| `apps/web/src/pages/AcceptInvite.tsx` | Token da URL → RPC accept_invite → dashboard |
| `apps/web/src/pages/Members.tsx` | Listar membros, convites pendentes, criar/revogar convite, remover membro |
| `apps/web/src/pages/AuthCallback.tsx` | Callback OAuth Google |
| `apps/web/src/pages/Home.tsx` | Placeholder mostrando workspace ativo + links |
| `apps/web/src/App.tsx` | **modificado** — rotas protegidas por guards |

### 2.3 Testes

| Arquivo | Propósito |
|---|---|
| `apps/api/tests/conftest.py` | Fixtures user_a, user_b, workspace_a + service_client |
| `apps/api/tests/test_rls.py` | Cenários de isolamento cross-workspace (13 testes parametrizados) |
| `.github/workflows/ci.yml` | **modificado** — job `rls` habilitado, roda pytest contra supabase local |

---

## 3. Decisões implementadas

| Ref DESIGN | Como foi feito |
|---|---|
| ADR-002 (transactions unificada) | Tabela `transactions` com `tipo ∈ (gasto, entrada)`; index composto `(workspace_id, tipo, data DESC)` |
| ADR-003 (parcelamento N linhas) | `compra_id` UUID compartilhado + `parcela_atual/parcelas_total`; função `create_installments` |
| ADR-005 (RLS primária + testes) | Todas as 11 tabelas com RLS; 13 testes parametrizados; job CI obrigatório |
| ADR-008 (convite custom) | Tabela `invites` + RPC `accept_invite` + Edge Function de email (Resend/dev fallback) |
| Trigger de bootstrap | `fn_add_owner_as_member` e `fn_create_profile_on_signup` |
| Seed de categorias | 13 categorias pt-BR (alimentação, transporte… salário… cripto) ao criar workspace |

### Padrão de RLS aplicado

```
profiles         → self read/write + co-members podem ler perfil
workspaces       → member read / owner write
workspace_members→ member read / owner manipula
invites          → owner-only (aceite via RPC SECURITY DEFINER)
{tabelas domínio}→ member read / editor+ write / audit via trigger
audit_logs       → member read; sem INSERT (só trigger SECURITY DEFINER)
```

---

## 4. Testes RLS — cenários cobertos

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | user_b lê workspaces de user_a | `data == []` |
| 2 | user_b lê workspace_members de user_a | `data == []` |
| 3 | user_b tenta inserir workspace com owner_id = user_a | erro |
| 4-9 | user_b tenta INSERT em cards/categories/transactions/recurring/investments/debts de workspace_a | erro (parametrizado) |
| 10 | user_b lê transactions de workspace_a | `data == []` |
| 11 | user_a lê seu próprio workspace | 1 linha |
| 12 | Seed de categorias criou ≥10 linhas | ok |
| 13 | accept_invite com token inválido | erro |
| 14 | accept_invite sem auth | erro |
| 15 | user_b lê audit_logs de workspace_a | `data == []` |

---

## 5. Nota sobre validação de hooks

Durante F1, hooks de PostToolUse do plugin Vercel sugeriram `"use client"` e `await params` em vários arquivos `.tsx`. **Ignorado** — são específicos do Next.js App Router. Este projeto usa **Vite + React Router DOM** (ADR-010), onde essas diretivas não existem/não se aplicam.

---

## 6. Verificações pendentes (runtime)

Execute localmente:

```bash
# 1. Aplicar migrations + Edge Function
supabase start
supabase db reset
supabase functions serve send-invite-email  # em outro terminal

# 2. Configurar trigger do invite → Edge Function (manual no Supabase Studio OU via migration extra)
# CREATE TRIGGER trg_send_invite AFTER INSERT ON invites
#   FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(...);
# (ou chamar a function do cliente React após inserir o invite — opção mais simples; implementada no hook)

# 3. Rodar RLS tests
cd apps/api && pip install -e ".[dev]"
export SUPABASE_URL=http://localhost:54321
export SUPABASE_ANON_KEY=$(supabase status -o env | awk -F= '/ANON_KEY/{print $2}')
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | awk -F= '/SERVICE_ROLE_KEY/{print $2}')
pytest tests/test_rls.py -v

# 4. Gerar tipos TS do schema real
pnpm gen:types

# 5. Rodar web em dev
pnpm dev:web
```

---

## 7. Desvios / débitos

| Item | Desvio | Ação |
|---|---|---|
| Trigger banco → Edge Function | Não adicionado via migration; atualmente a Edge Function é chamada pelo cliente após INSERT em `invites` (via hook `useMembers` em F2 pode-se mover). Alternativa: adicionar trigger HTTP em migration extra. | Decidir em F2 |
| Tipos TS | `database.ts` manual e minimalista | Rodar `pnpm gen:types` após `supabase db reset` |
| Google OAuth | Config TOML com provider desabilitado | Habilitar em `config.toml` ou no dashboard do Supabase com credenciais reais |
| Confirmação de email | Desabilitada no `config.toml` (para facilitar dev) | Habilitar em produção |
| Reset password page | Link no Login, mas página `/reset-password` não implementada | Criar em F1.5 (follow-up) ou F2 |

---

## 8. Próxima fase

```bash
# Sugestão: F2 — Transactions (gasto + entrada unificadas)
```

**F2 entrega:**
- Hook `useTransactions` (list + create + update + delete + search)
- Página `Transactions.tsx` (lista, filtros, busca)
- Form `TransactionForm.tsx` (gasto/entrada à vista)
- Testes unit dos Zod schemas + smoke test da página

Estimativa: 2 dias.

---

## Apêndice A — Quality Gate F1

- [x] Todas as migrations do DESIGN §3 criadas
- [x] RLS habilitada em 100% das tabelas
- [x] Edge Function de convite criada
- [x] Fluxo completo de auth + convite implementado
- [x] Suite de testes RLS obrigatória criada (ADR-005)
- [x] CI atualizado para rodar RLS job
- [x] Build report gerado
- [ ] Verificações runtime pendentes (§6)
