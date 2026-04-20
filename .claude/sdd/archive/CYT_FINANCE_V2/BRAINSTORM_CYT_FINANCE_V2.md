# BRAINSTORM — CYT Finance v2

**Feature:** `CYT_FINANCE_V2`
**Data:** 2026-04-19
**Fase:** 0 — Brainstorm (AgentSpec SDD)
**Próxima fase:** `/define .claude/sdd/features/BRAINSTORM_CYT_FINANCE_V2.md`

---

## 1. Contexto e Problema

O projeto atual (`app.js` + `index.html` + `style.css`) é um gerenciador financeiro pessoal SPA em Vanilla JS que persiste tudo em `localStorage`. Funciona para um único usuário em um único dispositivo, sem backup real, sem sincronização, sem compartilhamento.

**Objetivo da v2:** Transformar em aplicação real, com persistência server-side, autenticação, suporte a uso **pessoal e familiar compartilhado**, sincronização multi-dispositivo e base arquitetural para evoluções futuras (integração bancária, OFX, ML).

**Stack definida pelo usuário:** **Supabase** (Auth + Postgres + RLS) + **FastAPI** (Python) + **React** (PWA mobile-first).

---

## 2. Funcionalidades Identificadas na v1 (ground truth)

Mapeadas diretamente do `app.js`:

| Domínio | Operações v1 |
|---|---|
| Gastos | À vista e parcelados em cartão (com categoria, cartão, parcelas, descrição, data) |
| Entradas | Salário + renda extra |
| Recorrentes | Com limite de parcelas (0 = infinito) |
| Investimentos | Por categoria |
| Dívidas | A receber/pagar, por pessoa, parcelada |
| Cartões | Nome, últimos dígitos, dia de fechamento |
| Perfil | Nome do usuário |
| Dashboard | Entradas, saídas, resultado, caixa do mês |
| Gráficos | Mensal + vazamento de caixa (Chart.js) |
| Auditoria | Logs de ações do usuário |
| Histórico | Meses anteriores + pesquisa global |
| Impressão | Export custom por período |
| Dark theme | Alternância manual |
| Backup | Export/import JSON |

---

## 3. Decisões Coletadas

| # | Pergunta | Resposta | Implicação |
|---|---|---|---|
| 1 | Modelo de compartilhamento familiar | **Workspace único compartilhado** | Todos os membros veem/editam os mesmos dados. RLS por `workspace_id`. |
| 2 | Escopo do MVP | **Paridade total com v1** | Todas as funcionalidades migradas (com cortes internos via YAGNI). |
| 3 | Dados existentes | **Projeto novo** | Sem script de migração. `app.js` usado como ground truth de domínio. |
| 4 | Autenticação | **Email/senha + Google OAuth** | Supabase Auth nativo. |
| 4b | Onboarding familiar | **Convite por email (link único)** | Tabela `invites` + fluxo `inviteByEmail`. |
| 5a | Plataforma | **PWA mobile-first** | Service Worker, manifest, responsivo-first. |
| 5b | Sincronização | **Refresh manual via React Query** | Sem Supabase Realtime no MVP. |

---

## 4. Abordagem Arquitetural Escolhida

### Approach A — Supabase-heavy + FastAPI fino ⭐ **Selecionada**

```
┌─────────────┐
│   React     │  (PWA, mobile-first)
│  + TS + RQ  │
└──────┬──────┘
       │
       ├────► Supabase
       │       • Auth (email/senha + Google OAuth)
       │       • PostgREST (CRUD com RLS por workspace)
       │       • Convites (tabela invites + função RPC)
       │       • Storage (futuro: recibos em imagem)
       │
       └────► FastAPI (Python)
               • Geração de PDF (WeasyPrint)
               • Job cron: materialização de recurring → transactions
               • Dashboard agregado complexo (opcional)
               • Integrações futuras (OFX, Open Finance, etc.)
```

**Razões:**
1. Aproveita auth + convites + RLS nativos do Supabase
2. FastAPI ganha papel claro (Python-first: PDF, jobs, integrações)
3. ~60% menos código que fazer FastAPI ser API de CRUD
4. RLS como linha de defesa primária (com testes de segurança obrigatórios na fase de build)

**Approaches descartados:**
- **B** (FastAPI como API principal): reinventa metade do Supabase, vira SPOF.
- **C** (Híbrido por domínio): fronteira subjetiva, gera débito cognitivo.

---

## 5. Modelo de Dados (proposta inicial)

### Tabelas de identidade e workspace

| Tabela | Campos chave | Propósito |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `nome`, `avatar_url` | Perfil do usuário |
| `workspaces` | `id`, `nome`, `owner_id` | Espaço familiar |
| `workspace_members` | `workspace_id`, `user_id`, `role` (owner/editor/viewer), `joined_at` | Membership |
| `invites` | `id`, `workspace_id`, `email`, `token`, `expires_at`, `accepted_at` | Convite por email |

### Tabelas de domínio financeiro

| Tabela | Observação | Origem v1 |
|---|---|---|
| `cards` | `nome`, `ultimos_digitos`, `dia_fechamento` | `cartoes` |
| `categories` | `nome`, `tipo` (gasto/investimento), `cor`, `icone` | enums inline → tabela |
| `transactions` | `tipo` (gasto/entrada), `valor`, `descricao`, `categoria_id`, `data`, `cartao_id`, `parcela_atual`, `parcelas_total`, `paga`, `created_by` | `gastos` + `entradas` **unificadas** |
| `recurring` | `tipo`, `valor`, `descricao`, `data_inicio`, `limite_parcelas`, `categoria_id` | `recorrentes` |
| `investments` | `valor`, `descricao`, `categoria`, `data`, `created_by` | `investimentos` |
| `debts` | `tipo` (receber/pagar), `pessoa`, `valor_total`, `parcelas_total`, `parcelas_pagas`, `descricao`, `data_inicio` | `dividas` |
| `audit_logs` | `user_id`, `acao`, `entidade`, `payload` (jsonb) | `logs` |

**Todas** as tabelas de domínio têm `workspace_id` (FK) + RLS por membership.

### Decisões de modelagem importantes

1. **`transactions` unificada** — v1 tem 3 arrays separados; unificar reduz código ~40%.
2. **Parcelamento de cartão vira N linhas** — melhor para filtros e queries mensais.
3. **`recurring` gera `transactions` via job FastAPI** — usuário edita a regra, não as ocorrências.
4. **`audit_logs` em jsonb** — schema flexível.
5. **`categories` no banco** — permite customização por workspace.

### RLS padrão

```sql
-- Leitura: qualquer membro
CREATE POLICY "members_read" ON {tabela} FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Escrita: owner/editor
CREATE POLICY "editors_write" ON {tabela} FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner','editor')
  ));
```

---

## 6. YAGNI Aplicado

Mesmo com "paridade total", cortes razoáveis:

### Diferido para v2+

| Item | Razão |
|---|---|
| Backup manual JSON (import/export) | Postgres já faz backup; export CSV se houver dor |
| Impressão HTML custom com gradientes | MVP usa PDF server-side simples (WeasyPrint); HTML rico depois |
| Dark theme sincronizado no banco | Preferência local (localStorage do dispositivo) |
| Supabase Realtime | Refresh manual via React Query cobre 95% dos casos |
| Materialização otimista de recurring no cliente | Job cron no FastAPI é mais robusto |

### Substituições técnicas (reduzem código custom)

| v1 | v2 |
|---|---|
| `Chart.js` | `Recharts` (mais idiomático em React) |
| Modal custom em JS puro | `shadcn/ui` + `Radix UI` |
| `formatarMoeda()` custom | `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` |
| `normVal()` / `normData()` | `Zod` schemas na borda + `date-fns` com locale `pt-BR` |
| Tabs custom em JS | React Router + `/transactions`, `/investments`, `/debts`, etc. |

---

## 7. Samples Disponíveis para Grounding

- **Código da v1 como ground truth de domínio** (`app.js`): usado para inferir shapes, enums e regras (parcelamento, fechamento de cartão, limite de recorrentes).
- Sem dados de produção para migrar (decisão 3).

---

## 8. Stack Técnica Consolidada

### Frontend
- **React 18+** com TypeScript
- **Vite** (dev/build)
- **React Router** (roteamento)
- **React Query** (fetch/cache/invalidation)
- **@supabase/supabase-js** (client SDK)
- **shadcn/ui** + **Radix UI** + **Tailwind CSS**
- **Recharts** (gráficos)
- **React Hook Form** + **Zod** (formulários + validação)
- **date-fns** com locale `pt-BR`
- **PWA plugin** (Vite plugin PWA: manifest + service worker)

### Backend
- **Supabase** hospedado (Auth, Postgres, Storage, RLS, Edge Functions se necessário)
- **FastAPI** (Python 3.11+) em container/serverless
  - **Uvicorn** (ASGI)
  - **supabase-py** (service role para jobs)
  - **WeasyPrint** (PDF)
  - **APScheduler** ou cron externo (job de recurring)
  - **Pydantic v2** (schemas)
  - **Pytest** (testes, incluindo segurança RLS)

### Infra (proposta inicial, a refinar no /design)
- Supabase managed
- FastAPI: **Fly.io** ou **Render** (ambos suportam Python bem)
- Frontend: **Vercel** ou **Netlify**

---

## 9. Critérios de Sucesso (Draft — refinado no /define)

### Funcionais
- [ ] Usuário cria conta (email/senha ou Google)
- [ ] Owner cria workspace familiar e convida membros por email
- [ ] Convidado recebe email, clica no link, cria conta (se preciso) e entra no workspace
- [ ] Todos os membros veem e editam as mesmas transações, cartões, etc.
- [ ] Todos os domínios da v1 funcionam (gastos, entradas, recorrentes, investimentos, dívidas)
- [ ] Dashboard mostra entradas/saídas/resultado/caixa do mês
- [ ] Gráficos mensais e de categoria (vazamento de caixa) funcionam
- [ ] Histórico de meses anteriores navegável
- [ ] Busca global por descrição/valor/data
- [ ] Exportar relatório do período em PDF
- [ ] Auditoria: ver quem fez o quê

### Não-funcionais
- [ ] RLS validada por testes automatizados (tentativa de acesso cross-workspace deve falhar)
- [ ] PWA instalável no mobile
- [ ] First Contentful Paint < 2s em 3G
- [ ] Convites expiram em 7 dias
- [ ] Todos os valores monetários armazenados como `numeric(14,2)` (não float)

---

## 10. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Bug de RLS expõe dados entre famílias | Suite de testes de segurança obrigatória (testes automatizados que simulam usuário de outro workspace tentando ler/escrever) |
| Paridade total vira escopo gigante | `/define` quebra em fases internas; v1 das features CRUD primeiro, depois dashboard/gráficos, depois auditoria/PDF |
| Fronteira Supabase↔FastAPI mal definida vira débito | `/design` formaliza: Supabase = CRUD + RLS, FastAPI = Python-only (PDF, jobs) |
| Complexidade do parcelamento de cartão | Modelar N linhas em `transactions` desde o início; função SQL helper para criar parcelas |
| PWA + offline expectation | No MVP, PWA é apenas "instalável + cache estático". Offline writes ficam para v2. |

---

## 11. Próximos Passos

```bash
/define .claude/sdd/features/BRAINSTORM_CYT_FINANCE_V2.md
```

O `/define` deve produzir:
- Requisitos funcionais numerados (RF-01..RF-NN)
- Requisitos não-funcionais (RNF-01..RNF-NN)
- User stories com critérios de aceite
- Proposta de fatiamento do MVP em fases internas (sugestão: Fase 1 — Auth + Workspace + Convites; Fase 2 — Transactions CRUD; Fase 3 — Cartões + Parcelamento; Fase 4 — Recurring + Job; Fase 5 — Investimentos + Dívidas; Fase 6 — Dashboard + Gráficos; Fase 7 — Auditoria + PDF + PWA)

---

## Apêndice A — Quality Gate do Brainstorm

- [x] Mínimo 3 perguntas de descoberta (foram 5)
- [x] Pergunta de samples/ground truth feita
- [x] Ao menos 2 abordagens exploradas (foram 3: A, B, C)
- [x] YAGNI aplicado (5 itens diferidos, 5 substituições técnicas)
- [x] Mínimo 2 validações com o usuário (checkpoints 1 e 2)
- [x] Usuário confirmou abordagem selecionada (A)
- [x] Draft de requisitos incluído (seção 9)
