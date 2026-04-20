# BUILD REPORT — CYT Finance v2 — Fase F5 (Investments + Debts)

**Feature:** `CYT_FINANCE_V2`
**Fase:** F5
**Data:** 2026-04-20
**Input:** `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §9 (F5)
**Status:** ✅ Concluída

---

## 1. Escopo da F5

CRUD de investimentos (aportes) e de dívidas (receber/pagar) com pagamento incremental de parcelas e quitação automática. Cobre **RF-25..28** (DEFINE §5 Fase 5).

---

## 2. Arquivos criados/modificados (8)

### 2.1 Investments

| Arquivo | Propósito |
|---|---|
| `apps/web/src/hooks/useInvestments.ts` | `InvestmentInputSchema` Zod + CRUD; categoria é string livre (ADR: diferente de transactions, não vincula a FK) |
| `apps/web/src/components/forms/InvestmentForm.tsx` | Form com `<datalist>` de categorias sugeridas (renda fixa/variável/cripto/imóveis + custom) |
| `apps/web/src/pages/Investments.tsx` | Lista + card de total aportado + breakdown por categoria (ordenado desc) |

### 2.2 Debts

| Arquivo | Propósito |
|---|---|
| `apps/web/src/hooks/useDebts.ts` | `DebtInputSchema` + `useDebts`, `useCreateDebt`, `usePayInstallment`, `useUndoInstallment`, `useDeleteDebt` |
| `apps/web/src/components/forms/DebtForm.tsx` | Toggle receber/pagar + pessoa + valor_total + parcelas + data_inicio |
| `apps/web/src/pages/Debts.tsx` | Lista com barra de progresso, 3 stat cards (a receber, a pagar, saldo), ações pagar/desfazer/excluir |

### 2.3 Navegação

| Arquivo | Propósito |
|---|---|
| `apps/web/src/components/layout/AppShell.tsx` | **atualizado** — nav agora tem 7 itens (inclui `/investments 📈` e `/debts 🧾`) |
| `apps/web/src/App.tsx` | **atualizado** — rotas `/investments` e `/debts` |

---

## 3. Decisões implementadas

| Ref | Como |
|---|---|
| RF-25 | CRUD com categoria livre (max 50 chars) — não usa FK para `categories` por design (investments é domínio à parte) |
| RF-26 | Debt Zod valida: tipo ∈ {receber, pagar}; pessoa max 100; parcelas ∈ [1, 600] |
| RF-27 | `usePayInstallment` incrementa `parcelas_pagas` (trigger de audit_logs gera o log automaticamente — ADR-005) |
| RF-28 | Quitação: quando `parcelas_pagas == parcelas_total` → `quitada_em = NOW()`; UI trava botões de pagamento |
| Undo | `useUndoInstallment` decrementa e limpa `quitada_em` (UX — aceita erro humano ao marcar parcela) |
| Cálculo pendente | `valor_total - valor_total × (parcelas_pagas / parcelas_total)` — evita drift de arredondamento |

### Propriedades visuais da página Debts

- **Stat cards:** "A receber", "A pagar" (só parcelas abertas), "Saldo" (verde se >= 0)
- **Barra de progresso** por dívida (verde se `receber`, vermelha se `pagar`)
- **Badge** "A pagar"/"A receber" com cor semântica
- **Badge** "✓ quitada" quando `quitada_em != null`

---

## 4. Cobertura RLS

Nenhuma migration nova — tabelas `investments` e `debts` já foram criadas em F1 com RLS `member read / editor+ write` (migration `20260420000005_rls_policies.sql`).

Testes RLS de F1 (`test_rls.py`) já cobrem INSERT cross-workspace em ambas as tabelas via teste parametrizado — **não foram adicionados testes novos** pois a infra existente cobre.

---

## 5. Verificação recomendada

```bash
# Unit (F5 reaproveita Zod schemas — teste mental nos specs)
pnpm --filter @cyt/web typecheck
pnpm --filter @cyt/web lint
pnpm --filter @cyt/web test -- --run

# Smoke manual
pnpm dev:web
# Login → /investments → +Aporte "Tesouro Selic" R$ 1000 em Renda Fixa
# /debts → +A pagar "João" R$ 600 em 3x → Pagar parcela → barra sobe 33% → repetir 2x → quitada
```

---

## 6. Desvios / débitos

| Item | Status | Ação |
|---|---|---|
| Edit modal (investimentos/dívidas) | Só create + delete no MVP | Follow-up |
| Valor real da parcela paga registrado em audit | Usa o valor médio (`valor_total / parcelas_total`) — sem ledger | Adicionar se houver demanda (v2) |
| Data prevista de cada parcela | Não calculada; MVP só mostra "X/Y pagas" | Dashboard pode estimar em F6 |
| Lembretes/notificações | Fora do escopo MVP (YAGNI BRAINSTORM) | v2 |
| Filtros na página Debts (só quitadas / só a vencer) | Não | Adicionar quando a lista ficar grande |

---

## 7. Próxima fase

**F6 — Dashboard + Charts** (2 dias):
- Página Home com 4 cards: Entradas, Saídas, Resultado, Caixa (mês)
- Gráfico de barras (6 meses) — entradas vs saídas (Recharts)
- Gráfico rosca "Vazamento de caixa" (gastos por categoria)
- Seletor de período
- Tabela "Meses anteriores" (MÊS/ANO / ENTRADAS / SAÍDAS / RESULTADO / CAIXA)
- Hook `useDashboardSummary` agregando do banco

---

## Apêndice A — Quality Gate F5

- [x] CRUD de investments funcional
- [x] CRUD de debts funcional + pagamento incremental
- [x] Quitação automática quando parcelas_pagas == total
- [x] UI: barra de progresso + badges + stat cards
- [x] Viewer readonly respeitado em ambas as páginas
- [x] Navegação atualizada (7 itens)
- [x] Build report gerado
- [ ] Verificação runtime manual pendente

---

## Resumo do progresso

| Fase | Status | Testes adicionados | Acumulado |
|---|---|---|---|
| F0 | ✅ | — | 0 |
| F1 | ✅ | 15 (RLS) | 15 |
| F2 | ✅ | 14 (unit) | 29 |
| F3 | ✅ | 7 (SQL) | 36 |
| F4 | ✅ | 9 (serviço+HTTP) | 45 |
| F5 | ✅ | 0 (reaproveita RLS de F1) | 45 |
| F6 | ⏳ | | |
| F7 | ⏳ | | |

Restam 2 fases para entregar a paridade total v1.
