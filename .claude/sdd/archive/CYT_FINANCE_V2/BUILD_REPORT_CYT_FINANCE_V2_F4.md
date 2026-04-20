# BUILD REPORT — CYT Finance v2 — Fase F4 (Recurring + Cron FastAPI)

**Feature:** `CYT_FINANCE_V2`
**Fase:** F4
**Data:** 2026-04-20
**Input:** `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §9 (F4)
**Status:** ✅ Concluída

---

## 1. Escopo da F4

Regras recorrentes + job idempotente no FastAPI que materializa como transações diariamente. Cobre **RF-21..24** (DEFINE §5 Fase 4).

---

## 2. Arquivos criados/modificados (13)

### 2.1 Web

| Arquivo | Propósito |
|---|---|
| `apps/web/src/hooks/useRecurring.ts` | CRUD + Zod (`RecurringInputSchema`); invalidação isolada |
| `apps/web/src/components/forms/RecurringForm.tsx` | Toggle gasto/entrada fixa; campo "limite_parcelas (0 = infinito)" |
| `apps/web/src/pages/Recurring.tsx` | Lista com status ativo/pausada, contínua (limite=0) vs finita, ações Pausar/Retomar/Excluir |
| `apps/web/src/components/layout/AppShell.tsx` | **atualizado** — item "Recorrentes 🔁" |
| `apps/web/src/App.tsx` | **atualizado** — rota `/recurring` |

### 2.2 FastAPI

| Arquivo | Propósito |
|---|---|
| `apps/api/src/deps.py` | `current_user` (valida JWT HS256) + `require_cron_secret` (header `X-Cron-Secret`) |
| `apps/api/src/schemas/__init__.py` | Package marker |
| `apps/api/src/schemas/recurring.py` | `RecurringTickResponse` (materialized/skipped/errors/ran_at) |
| `apps/api/src/services/__init__.py` | Package marker |
| `apps/api/src/services/supabase_service.py` | `get_service_client()` via `lru_cache` (service_role) |
| `apps/api/src/services/recurring_service.py` | `materialize_due(client, today)` com idempotência + limite |
| `apps/api/src/routers/recurring.py` | `POST /recurring/tick` protegido por X-Cron-Secret |
| `apps/api/src/main.py` | **atualizado** — registra router `recurring` |

### 2.3 Testes + Docs

| Arquivo | Propósito |
|---|---|
| `apps/api/tests/test_recurring.py` | 9 testes (7 serviço com fake client + 2 router HTTP) |
| `apps/api/docs/cron-setup.md` | Guia: GitHub Actions (recomendado) / pg_cron / Fly machine |

---

## 3. Lógica de idempotência (ADR-004)

```
Para cada regra ativa com data_inicio <= hoje:
  1. Se existe transaction (recurring_id=rule.id AND data=hoje) → SKIP
  2. Se limite_parcelas > 0 E parcelas_materializadas >= limite → SKIP
  3. Insert transaction + Update recurring.parcelas_materializadas += 1
```

Múltiplas chamadas no mesmo dia retornam 0 materializadas — seguro para retry.

---

## 4. Testes adicionados (9)

### Serviço (7 — fake client em memória, sem Supabase)

| # | Cenário | Resultado |
|---|---|---|
| 1 | Materializa regra ativa uma vez | count=1, insert + update |
| 2 | Idempotência no mesmo dia | count=0, skip=1 |
| 3 | Regra inativa ignorada | count=0 |
| 4 | `data_inicio` no futuro é filtrada | count=0 |
| 5 | Limite atingido (`ja_feitas >= limite`) | skip=1 |
| 6 | Sob o limite materializa + incrementa | count=1, parcelas_materializadas += 1 |
| 7 | Múltiplas regras independentes | 2 ativas = 2 materializadas |

### HTTP (2)

| # | Cenário | HTTP |
|---|---|---|
| 8 | Sem header `X-Cron-Secret` | 422 (missing required header) |
| 9 | Secret errado | 403 `invalid_cron_secret` |

**Total acumulado: F1 (15) + F2 (14) + F3 (7) + F4 (9) = 45 testes.**

---

## 5. Decisões implementadas

| Ref | Como |
|---|---|
| ADR-004 (materialização via FastAPI) | Service `materialize_due(client, today)` puro; cron chama POST /recurring/tick |
| ADR-006 (JWT Supabase) | `deps.current_user` decodifica `HS256` com `SUPABASE_JWT_SECRET` |
| RF-22 | Job idempotente com chave `recurring_id + data` |
| RF-23 | Editar regra NÃO reverte histórico — UI só atualiza, não toca transactions |
| RF-24 | Excluir regra preserva transactions (FK `ON DELETE SET NULL` em `recurring_id`) |

---

## 6. Verificação recomendada

```bash
# API tests
cd apps/api && pytest tests/test_recurring.py -v

# End-to-end local (com Supabase)
supabase start && supabase db reset
export CRON_SECRET=test-secret
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | awk -F= '/SERVICE_ROLE_KEY/{print $2}' | tr -d '"')
uvicorn src.main:app --reload &

# No frontend, criar regra: /recurring → "+ Nova regra" → Aluguel R$ 1.500 infinita
# Disparar tick:
curl -X POST -H "X-Cron-Secret: test-secret" http://localhost:8000/recurring/tick
# → { "materialized_count": 1, ... }

# Segundo tick no mesmo dia:
curl -X POST -H "X-Cron-Secret: test-secret" http://localhost:8000/recurring/tick
# → { "materialized_count": 0, "skipped_count": 1, ... }
```

---

## 7. Desvios / débitos

| Item | Status | Ação |
|---|---|---|
| Edição de regra com recalcule histórico | Explícito: **não** acontece (RF-23) | Documentado |
| "Próxima cobrança" no dashboard | Não implementado | F6 (dashboard) |
| Recorrentes semanais/quinzenais | MVP cobre só mensais (dia do ciclo = dia do `data_inicio`) | Adicionar `frequencia` em v2 se pedirem |
| Deploy do cron no GitHub Actions | Docs prontas, workflow não criado ainda | Ativar no dia do deploy |

---

## 8. Próxima fase

**F5 — Investments + Debts** (1-2 dias): hooks + páginas + form; reaproveita infra de F2 (schemas, Zod, Modal, AppShell). Cobre RF-25..28.

---

## Apêndice A — Quality Gate F4

- [x] Job FastAPI idempotente testado (7 cenários)
- [x] Auth do cron via secret header
- [x] UI CRUD completa de regras recorrentes
- [x] Pausar/retomar regra implementado
- [x] Docs de deploy do cron (3 opções)
- [x] Build report gerado
- [ ] Verificação runtime manual pendente
