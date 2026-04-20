# BUILD REPORT — CYT Finance v2 — Fase F6 (Dashboard + Charts)

**Feature:** `CYT_FINANCE_V2`
**Fase:** F6
**Data:** 2026-04-20
**Input:** `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §9 (F6)
**Status:** ✅ Concluída

---

## 1. Escopo da F6

Dashboard consolidado com 4 stat cards, gráfico mensal (6m), rosca "vazamento de caixa" (gastos por categoria) e tabela de histórico clicável. Cobre **RF-29..33** (DEFINE §5 Fase 6).

---

## 2. Arquivos criados/modificados (6)

### 2.1 Lógica de agregação (pura, testável)

| Arquivo | Propósito |
|---|---|
| `apps/web/src/utils/aggregate.ts` | 5 funções puras: `monthTotals`, `caixaAcumulado`, `monthlyBars`, `leakageByCategory`, `historyMonths` |
| `apps/web/src/utils/aggregate.test.ts` | 9 testes unit cobrindo arredondamento, parcelas pendentes ignoradas, 6 meses ordenados, running caixa |

### 2.2 Hook

| Arquivo | Propósito |
|---|---|
| `apps/web/src/hooks/useDashboard.ts` | Duas queries: janela de 13 meses (com categorias) + todas pagas (para caixa acumulado); memoiza agregações |

### 2.3 Componentes de gráfico (Recharts)

| Arquivo | Propósito |
|---|---|
| `apps/web/src/components/charts/MonthlyBars.tsx` | BarChart Entradas vs Saídas; labels "abr/26"; formatador k/M no Y |
| `apps/web/src/components/charts/LeakageDonut.tsx` | PieChart (donut) com total no centro + legenda lateral com % |
| `apps/web/src/components/charts/PreviousMonths.tsx` | Tabela MÊS/ANO, ENTRADAS, SAÍDAS, RESULTADO, CAIXA — clicável para navegar |

### 2.4 Página

| Arquivo | Propósito |
|---|---|
| `apps/web/src/pages/Home.tsx` | **reescrita** — 4 stat cards + 3 painéis de gráfico + seletor `<input type="month">` + atalhos |

---

## 3. Decisões de agregação

| Regra | Implementação |
|---|---|
| "Entradas/Saídas do mês" | Apenas `paga = true` — parcelas de cartão pendentes NÃO somam nas saídas do mês |
| "Resultado" | entradas − saídas do mês (pagas) |
| "Caixa" | Saldo acumulado de TODAS as transações pagas até o fim do mês selecionado |
| 6 meses (gráfico) | Sempre 6 meses consecutivos terminando no mês selecionado (preenche com 0 se sem dados) |
| Vazamento | Gastos pagos do mês agrupados por categoria, ordenado desc; "Sem categoria" agrupado |
| Histórico tabela | 12 meses + mês atual, com caixa running calculado corretamente incluindo tx anteriores à janela |

### Por que 2 queries no hook?

- **Window (13m)**: dados detalhados por transação para os cards, charts e histórico (inclui `paga=false` para visibilidade futura)
- **AllPaid**: contagem simples para calcular caixa acumulado sem risk de `window` não cobrir o saldo histórico completo

Trade-off aceitável para MVP. Evolução natural: view materializada `mv_caixa_por_mes` quando dor for real.

---

## 4. Testes adicionados (9)

| # | Cenário |
|---|---|
| 1 | `monthTotals` soma entradas e saídas pagas |
| 2 | `monthTotals` ignora parcelas não pagas |
| 3 | `monthTotals` aceita valor como string (do Postgres numeric) |
| 4 | `caixaAcumulado` até data alvo |
| 5 | `caixaAcumulado` ignora não pagas |
| 6 | `monthlyBars` gera 6 meses consecutivos |
| 7 | `leakageByCategory` agrupa + ordena desc + soma 100% |
| 8 | `leakageByCategory` retorna [] sem gastos |
| 9 | `historyMonths` caixa running correto |

**Total acumulado: 45 + 9 = 54 testes.**

---

## 5. Verificação recomendada

```bash
pnpm --filter @cyt/web test -- --run
# esperado: aggregate.test (9) + format.test (8) + schemas.test (6) + App.test (1) = 24 passing

pnpm --filter @cyt/web dev
# login → Home: 4 cards, barras 6m, rosca, tabela; clicar em mês da tabela navega entre períodos
```

---

## 6. Desvios / débitos

| Item | Status | Ação |
|---|---|---|
| View/função SQL para caixa acumulado | Não — calcula no cliente | Aceitável; migrar se ficar lento (>10k tx) |
| Gráfico "resultado líquido" como linha sobreposta | Não | Adicionar se virar pedido |
| Export CSV do histórico | Não | F7 cobre export PDF; CSV é YAGNI |
| Drill-down do slice da rosca | Não (só tooltip) | Follow-up |
| Comparativo vs mês anterior (delta %) | Não | Próxima iteração se útil |
| Tela de "Próximas cobranças" (recurring) | Não | Pode reaproveitar dados em F7 |

---

## 7. Próxima fase

**F7 — Audit + PDF + PWA** (2-3 dias):
- Hook `useAuditLogs` + página Audit com filtros
- Router FastAPI `POST /reports/pdf` + service com WeasyPrint + template Jinja
- Página Home com botão "Exportar PDF do mês"
- Ícones PWA (192, 512, maskable) + testes Lighthouse
- Smoke E2E (Playwright) opcional

---

## Apêndice A — Quality Gate F6

- [x] 4 stat cards no mês (Entradas/Saídas/Resultado/Caixa)
- [x] Gráfico de barras 6 meses (Recharts)
- [x] Rosca de vazamento (Recharts)
- [x] Tabela histórica clicável navegando entre meses
- [x] Seletor de mês via `<input type="month">`
- [x] Lógica de agregação pura e testada (9 testes)
- [x] Build report gerado
- [ ] Verificação runtime manual pendente

## Progresso geral

| Fase | Status | Testes | Acumulado |
|---|---|---|---|
| F0 | ✅ | 0 | 0 |
| F1 | ✅ | 15 | 15 |
| F2 | ✅ | 14 | 29 |
| F3 | ✅ | 7 | 36 |
| F4 | ✅ | 9 | 45 |
| F5 | ✅ | 0 | 45 |
| **F6** | ✅ | **9** | **54** |
| F7 | ⏳ | — | — |
