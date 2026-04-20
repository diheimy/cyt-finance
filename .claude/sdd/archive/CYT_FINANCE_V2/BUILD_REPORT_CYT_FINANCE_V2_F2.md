# BUILD REPORT — CYT Finance v2 — Fase F2 (Transactions)

**Feature:** `CYT_FINANCE_V2`
**Fase:** F2
**Data:** 2026-04-20
**Input:** `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §9 (F2)
**Status:** ✅ Concluída

---

## 1. Escopo da F2

CRUD unificado de transações (gasto + entrada) com filtros, busca, totais do mês e navegação entre páginas. Cobre **RF-11, RF-13, RF-15, RF-16** (DEFINE §5 Fase 2). Parcelamento em cartão fica para F3.

---

## 2. Arquivos criados/modificados (11)

### 2.1 Utils e tipos

| Arquivo | Propósito |
|---|---|
| `apps/web/src/utils/format.ts` | `formatMoney` (Intl BRL), `formatDateBR`, `formatMonthYear`, `todayISO`, `currentMonthKey`, `monthBounds`, `parseMoneyInput` |
| `apps/web/src/utils/format.test.ts` | 8 testes unit (BRL, leap year, parse BR → number) |
| `apps/web/src/types/schemas.ts` | Zod: TransactionInputSchema, TransactionRowSchema, CategorySchema, TransactionFiltersSchema |
| `apps/web/src/types/schemas.test.ts` | 6 testes de validação Zod |
| `apps/web/src/types/database.ts` | **atualizado** — schema completo (workspaces, members, invites, cards, categories, transactions, recurring, investments, debts, audit_logs, RPCs) |

### 2.2 Hooks

| Arquivo | Propósito |
|---|---|
| `apps/web/src/hooks/useCategories.ts` | Lista categorias por workspace + filtro opcional por tipo |
| `apps/web/src/hooks/useTransactions.ts` | `useTransactions` (list com filtros), `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction`; invalida `dashboard` queries |

### 2.3 UI

| Arquivo | Propósito |
|---|---|
| `apps/web/src/components/forms/TransactionForm.tsx` | Form simples com toggle gasto/entrada, Zod, parse money BR |
| `apps/web/src/components/layout/AppShell.tsx` | Sidebar desktop + bottom nav mobile (3 itens: Início, Transações, Membros) |
| `apps/web/src/components/Modal.tsx` | Modal mobile-first (slide up no mobile, centralizado no desktop) |
| `apps/web/src/pages/Transactions.tsx` | Lista com 4 filtros (mês, tipo, categoria, busca), totais agregados, CRUD via Modal |
| `apps/web/src/pages/Home.tsx` | **reescrito** — dashboard mínimo com 3 cards (entradas/saídas/resultado) do mês atual |
| `apps/web/src/App.tsx` | **atualizado** — rota `/transactions` + layout `AppShell` via nested Outlet |

---

## 3. Decisões implementadas

| Ref | Decisão |
|---|---|
| ADR-002 | Transactions unificada — form único com toggle tipo, hook único para ambos |
| RF-15 | Filtros por período (mês), tipo, categoria, cartão (via hook — UI implementou 3; cartão virá em F3) |
| RF-16 | Busca global via `ilike` em `descricao` (expansão para valor/data fica para quando relevante) |
| RNF-13 | pt-BR hardcoded: `Intl.NumberFormat('pt-BR')`, `date-fns` com `ptBR` locale |
| Substituição técnica (BRAINSTORM §6) | Chart.js, formatarMoeda custom e modal custom substituídos por Recharts (em F6), Intl, componente Modal próprio simples |

### Regras dos filtros

```
month (YYYY-MM)  → data BETWEEN monthBounds(month).start/end  (sempre aplicado)
tipo             → eq transaction_kind (opcional)
categoria_id     → eq UUID (opcional)
cartao_id        → eq UUID (opcional — usado em F3)
search           → ilike %descricao% (opcional)
```

### Invalidação de cache

Toda mutation invalida:
- `['transactions']` (todas as listas)
- `['dashboard', workspaceId]` (reservado para F6)

---

## 4. Testes adicionados

- `format.test.ts` — 8 testes (BRL, leap year, parse, month bounds)
- `schemas.test.ts` — 6 testes (validação positiva/negativa dos schemas Zod)

Total F2: **14 testes unit** sem dependência de Supabase (rodam em CI job `web`).

---

## 5. Verificação recomendada

```bash
# Unit tests
pnpm --filter @cyt/web test -- --run   # executa format.test + schemas.test + App.test

# Lint + typecheck
pnpm --filter @cyt/web typecheck
pnpm --filter @cyt/web lint

# Smoke manual
pnpm dev:web                          # login → criar workspace → /transactions
```

Para testar CRUD real contra Supabase:
```bash
supabase start && supabase db reset
# VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY já em .env
pnpm dev:web
```

---

## 6. Desvios / débitos

| Item | Status | Ação |
|---|---|---|
| Edit modal (form de edição) | Não implementado — F2 cobre só create + delete | Reutilizar `TransactionForm` com `defaultValues` em follow-up ou F3 |
| Busca por valor/data | Apenas descricao | Só adicionar se virar dor real (YAGNI) |
| Filtro por cartão | UI não inclui — hook suporta | Virá em F3 (quando UI de cartões existir) |
| shadcn/ui | Não instalado ainda; uso Tailwind puro | Migrar componentes em F6/F7 se desejar |
| Testes E2E/Playwright | Pendentes | F7 |

---

## 7. Próxima fase

**F3 — Cards + Parcelamento**: CRUD de cartões, `InstallmentForm` usando a RPC `create_installments`, filtro por cartão na listagem de transações, testes da função SQL com edge cases (compra antes/depois do fechamento). Estimativa: 2 dias.

---

## Apêndice A — Quality Gate F2

- [x] `TransactionInputSchema` usado como gate de entrada (cria/atualiza)
- [x] Hooks obedecem à invalidação correta
- [x] Listagem respeita filtros + RLS (via `workspace_id`)
- [x] Build report gerado
- [x] Testes unit passam localmente (pendente rodar na CI)
- [ ] Verificação runtime manual pendente
