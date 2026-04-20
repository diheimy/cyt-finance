# BUILD REPORT — CYT Finance v2 — Fase F3 (Cards + Parcelamento)

**Feature:** `CYT_FINANCE_V2`
**Fase:** F3
**Data:** 2026-04-20
**Input:** `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §9 (F3)
**Status:** ✅ Concluída

---

## 1. Escopo da F3

CRUD completo de cartões + fluxo de gastos parcelados usando a RPC `create_installments` com respeito ao dia de fechamento. Cobre **RF-17, RF-18, RF-19** (DEFINE §5 Fase 3). RF-20 (editar 1 parcela vs todas) ficou parcial — documentado como débito.

---

## 2. Arquivos criados/modificados (8)

### 2.1 Hooks

| Arquivo | Propósito |
|---|---|
| `apps/web/src/hooks/useCards.ts` | CRUD cartões + `CardInputSchema` Zod; validação últimos 4 dígitos + dia 1-31 |
| `apps/web/src/hooks/useInstallments.ts` | Chama RPC `create_installments`; `InstallmentInputSchema` exige ≥ 2 parcelas, ≤ 60 |

### 2.2 UI

| Arquivo | Propósito |
|---|---|
| `apps/web/src/components/forms/CardForm.tsx` | Create + edit de cartão; máscara numérica dos 4 dígitos |
| `apps/web/src/components/forms/InstallmentForm.tsx` | Form de parcelamento; mostra preview `Nx de R$ XX,XX`; avisa se não há cartões |
| `apps/web/src/pages/Cards.tsx` | Lista em grid; edit/delete com confirmação; respeita viewer (readonly) |
| `apps/web/src/pages/Transactions.tsx` | **atualizado** — 2 botões (+Nova / +Parcelado), filtro por cartão, coluna mostra `Cartão •••• 1234 · parcela N/M · pendente` |
| `apps/web/src/components/layout/AppShell.tsx` | **atualizado** — item "Cartões 💳" na nav |
| `apps/web/src/App.tsx` | **atualizado** — rota `/cards` |

### 2.3 Testes

| Arquivo | Propósito |
|---|---|
| `apps/api/tests/test_installments.py` | 7 cenários da RPC `create_installments` (ver §4) |

---

## 3. Decisões implementadas

| Ref | Como foi feito |
|---|---|
| ADR-003 (N linhas) | Parcelas são linhas independentes com `compra_id` compartilhado; UI agrupa visualmente |
| RF-18 | RPC respeita dia de fechamento: compra ≤ dia → próxima fatura; compra > dia → pula 1 mês |
| RF-19 | Cada linha tem `parcela_atual` (1..N) e `parcelas_total`; UI exibe "parcela 3/6" |
| Parcelas pendentes | `paga = false` para parcelas de cartão; UI marca como "pendente" (badge) |
| Arredondamento | Primeiras N-1 parcelas = `ROUND(total/N, 2)`; última ajustada para fechar o total exato (testado) |
| Viewer readonly | `CardForm` + botões +Nova/+Parcelado/Editar só aparecem se `role !== 'viewer'` |

---

## 4. Testes SQL adicionados (7)

| # | Cenário | Resultado |
|---|---|---|
| 1 | Compra ANTES do fechamento (dia 5, fechamento 10) | 1ª parcela no mês seguinte |
| 2 | Compra DEPOIS do fechamento (dia 20, fechamento 5) | 1ª parcela em mês+2 |
| 3 | `100 ÷ 3` com arredondamento | `33,33 + 33,33 + 33,34 = 100,00` |
| 4 | Parcelas de cartão começam `paga = false` | ok |
| 5 | Não-editor (sem membership) chamando RPC | erro (SECURITY DEFINER + fn_is_editor) |
| 6 | Cartão de outro workspace | erro (RPC checa `workspace_id` match) |
| 7 | Compra EXATAMENTE no dia de fechamento | 1ª parcela no mês seguinte (operador `<=`) |

Total acumulado de testes: **F1 (15 RLS) + F2 (14 unit) + F3 (7 SQL) = 36 testes**.

---

## 5. Verificação recomendada

```bash
# Testes SQL contra Supabase local
supabase start && supabase db reset
export SUPABASE_URL=http://localhost:54321
export SUPABASE_ANON_KEY=$(supabase status -o env | awk -F= '/ANON_KEY/{print $2}' | tr -d '"')
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | awk -F= '/SERVICE_ROLE_KEY/{print $2}' | tr -d '"')
cd apps/api && pytest tests/test_installments.py -v

# Smoke manual
pnpm dev:web
# Login → criar workspace → /cards → criar cartão "Nubank" (••••1234, fechamento 5)
#      → /transactions → + Parcelado → 600,00 em 6x → ver 6 linhas nos meses seguintes
```

---

## 6. Desvios / débitos

| Item | Status | Ação |
|---|---|---|
| RF-20 — edit "esta / a partir desta / todas" | **Só delete (de 1 parcela)** implementado | Adicionar dropdown de edit com escopo em F5 ou follow-up |
| Pagamento de parcelas (marcar `paga = true`) | Pendente | Ligado à fatura (F6/F7) ou botão manual em follow-up |
| Reconstituir valores totais quando edita valor de uma parcela | N/A no MVP | YAGNI |
| `ON DELETE CASCADE` entre parcelas da mesma `compra_id` | Não — cada linha é independente por design (ADR-003) | Documentado |

---

## 7. Próxima fase

**F4 — Recurring + Cron FastAPI** (2 dias):
- Hook `useRecurring` + página Recurring
- Router FastAPI `POST /recurring/tick` com auth via `X-Cron-Secret`
- Service `recurring_service.materialize_due()` — chave de idempotência `recurring_id + data`
- Testes pytest do serviço (mock Supabase) + smoke da rota
- Docs de como disparar o cron (Fly.io, GitHub Actions ou Supabase cron)

---

## Apêndice A — Quality Gate F3

- [x] CRUD de cartões completo (create, list, edit, delete)
- [x] RPC `create_installments` integrada e testada (7 cenários)
- [x] UI mostra "parcela N/M · pendente · Cartão •••• XXXX"
- [x] Filtro por cartão na listagem de transações
- [x] Viewers não veem botões de escrita
- [x] Build report gerado
- [ ] Verificação runtime manual pendente
