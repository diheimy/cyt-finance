# DEFINE — CYT Finance v2

**Feature:** `CYT_FINANCE_V2`
**Data:** 2026-04-19
**Fase:** 1 — Define (AgentSpec SDD)
**Status:** ✅ Shipped (arquivado em 2026-04-20)
**Input:** `.claude/sdd/features/BRAINSTORM_CYT_FINANCE_V2.md`
**Clarity Score:** 14/15 ✅

---

## 1. Problema

A v1 do CYT Finance é um SPA Vanilla JS monousuário com persistência em `localStorage`. Isso gera três dores reais:

1. **Dados presos a um dispositivo** — abrir no celular da esposa = começar do zero.
2. **Sem compartilhamento familiar** — casais/famílias não conseguem ver as mesmas finanças.
3. **Sem proteção real dos dados** — limpar cache do browser = perder histórico financeiro.

A v2 precisa resolver os 3 pontos preservando **100% das funcionalidades atuais** (paridade total) e oferecendo base arquitetural para evoluções futuras (integração bancária, OFX, ML).

---

## 2. Personas

### Persona A — **Ana, 34, gestora do lar** *(primária)*
- Controla gastos do casal, lança transações pelo celular no supermercado
- Pouco técnica: valoriza UX simples, login sem senha complexa, PWA instalável
- Precisa ver rapidamente: "quanto entrou", "quanto saiu", "quanto sobrou este mês"

### Persona B — **Bruno, 38, marido da Ana** *(secundária)*
- Acessa de casa pelo notebook à noite para analisar categorias e planejar
- Mais técnico: gosta de gráficos, projeções, export em PDF
- Cria o workspace, convida Ana por email, gerencia categorias e cartões

### Persona C — **Usuário solo** *(edge case)*
- Pessoa que usa sozinha, sem família. Fluxo de convite é opcional, não obrigatório.

---

## 3. Metas (Goals)

| # | Meta | Mensurável |
|---|---|---|
| G-01 | Substituir localStorage por persistência segura em Supabase | 100% das mutations gravam no banco |
| G-02 | Permitir uso familiar com workspace compartilhado | ≥1 convite por email aceito e editando dados |
| G-03 | Entregar paridade funcional com v1 | 7/7 domínios da v1 funcionando (ver §5) |
| G-04 | Sincronização multi-dispositivo | Nova transação em dispositivo A aparece em B após reload |
| G-05 | PWA instalável mobile-first | Lighthouse PWA score ≥ 90 |
| G-06 | Isolamento absoluto entre workspaces | 0 vazamentos em testes de RLS |

---

## 4. Critérios de Sucesso Mensuráveis

### Funcionais
- [ ] **SF-01** — Usuário cria conta via email/senha OU Google em < 60s
- [ ] **SF-02** — Owner convida 1+ membro por email; convidado entra e edita em < 5min
- [ ] **SF-03** — Todos os 7 domínios funcionam (transactions, cards, categories, recurring, investments, debts, audit)
- [ ] **SF-04** — Dashboard mostra entradas/saídas/resultado/caixa do mês atual
- [ ] **SF-05** — Gráficos: mensal (barras) + vazamento de caixa (rosca por categoria)
- [ ] **SF-06** — Histórico de meses anteriores navegável; busca global por texto/valor/data
- [ ] **SF-07** — Export de relatório por período em PDF (server-side)
- [ ] **SF-08** — Auditoria: lista de ações com usuário, timestamp e payload

### Não-funcionais
- [ ] **SNF-01** — RLS validada: teste automatizado tenta ler/escrever em workspace alheio → rejeitado (HTTP 401/403 ou linhas vazias)
- [ ] **SNF-02** — Valores monetários armazenados como `numeric(14,2)` (nunca `float`)
- [ ] **SNF-03** — PWA: manifest + service worker + ícones; instalável no Chrome mobile
- [ ] **SNF-04** — FCP < 2s em 3G simulado (Chrome DevTools)
- [ ] **SNF-05** — Convites expiram em 7 dias e ficam inválidos após uso
- [ ] **SNF-06** — Tokens JWT do Supabase validados em todas as rotas do FastAPI
- [ ] **SNF-07** — Zero uso de `localStorage` para dados financeiros (só tema/preferências)

---

## 5. Requisitos Funcionais (RF)

Numerados por domínio; agrupados em **7 fases internas** para facilitar o planejamento no `/design`.

### 🔐 Fase 1 — Identidade e Workspace (auth + convites)

| ID | Requisito |
|---|---|
| **RF-01** | O sistema deve permitir cadastro via email/senha usando Supabase Auth |
| **RF-02** | O sistema deve permitir cadastro/login via Google OAuth |
| **RF-03** | O sistema deve permitir reset de senha via email |
| **RF-04** | O primeiro login deve criar automaticamente um `profile` vinculado ao `auth.user.id` |
| **RF-05** | Um usuário sem workspace deve ter opção de (a) criar um novo ou (b) aceitar convite |
| **RF-06** | O `owner` de um workspace deve poder convidar novos membros por email, gerando token de uso único |
| **RF-07** | O convidado deve receber email com link contendo o token; o link deve abrir a aplicação e aceitar o convite |
| **RF-08** | Convites devem expirar em 7 dias (SNF-05) |
| **RF-09** | O `owner` deve poder promover/rebaixar papéis (owner/editor/viewer) e remover membros |
| **RF-10** | Um usuário deve poder pertencer a múltiplos workspaces e alternar entre eles |

### 💸 Fase 2 — Transactions (gastos + entradas unificadas)

| ID | Requisito |
|---|---|
| **RF-11** | O sistema deve criar transações com `tipo ∈ {gasto, entrada}`, valor, descrição, data, categoria |
| **RF-12** | Gastos podem ser "à vista" ou "parcelados em cartão" |
| **RF-13** | Entradas podem ser classificadas como "salário" ou "renda extra" (via categoria) |
| **RF-14** | Edição/exclusão de transação deve gerar log de auditoria (ver RF-42) |
| **RF-15** | O sistema deve permitir filtrar transações por período, categoria, tipo e cartão |
| **RF-16** | A busca global deve pesquisar por descrição, valor ou data |

### 💳 Fase 3 — Cartões e Parcelamento

| ID | Requisito |
|---|---|
| **RF-17** | O sistema deve permitir CRUD de cartões (nome, últimos 4 dígitos, dia de fechamento) |
| **RF-18** | Ao criar gasto parcelado em cartão, o sistema deve gerar **N linhas** em `transactions` (uma por parcela), respeitando o dia de fechamento para definir o mês de cada parcela |
| **RF-19** | Cada parcela deve referenciar o cartão e conter `parcela_atual` e `parcelas_total` |
| **RF-20** | Editar uma transação parcelada deve oferecer: editar só esta parcela, editar todas a partir desta, editar todas |

### 🔁 Fase 4 — Recurring + Job

| ID | Requisito |
|---|---|
| **RF-21** | O sistema deve permitir cadastro de regras recorrentes (tipo, valor, descrição, categoria, data início, limite de parcelas; 0 = infinito) |
| **RF-22** | Um job no FastAPI deve executar diariamente e materializar recorrentes vencidas como `transactions` |
| **RF-23** | Editar uma regra recorrente NÃO deve alterar transações já materializadas; deve alterar apenas as futuras |
| **RF-24** | Excluir uma regra recorrente deve manter o histórico materializado |

### 📈 Fase 5 — Investments + Debts

| ID | Requisito |
|---|---|
| **RF-25** | O sistema deve permitir CRUD de investimentos (valor, descrição, categoria, data) |
| **RF-26** | O sistema deve permitir CRUD de dívidas (tipo receber/pagar, pessoa, valor total, parcelas total, parcelas pagas) |
| **RF-27** | Pagar uma parcela de dívida deve incrementar `parcelas_pagas` e gerar log |
| **RF-28** | Quitação de dívida deve marcar `quitada_em` (timestamp) e travar edição |

### 📊 Fase 6 — Dashboard + Gráficos

| ID | Requisito |
|---|---|
| **RF-29** | O dashboard deve exibir 4 cards: Entradas, Saídas, Resultado, Caixa (mês atual) |
| **RF-30** | O gráfico mensal (barras) deve mostrar entradas vs saídas dos últimos 6 meses |
| **RF-31** | O gráfico "vazamento de caixa" (rosca) deve mostrar % de gastos por categoria no mês selecionado |
| **RF-32** | Deve haver seletor de período (mês/ano) para todos os gráficos e tabelas |
| **RF-33** | Meses anteriores devem ser navegáveis (tabela com MÊS/ANO, ENTRADAS, SAÍDAS, RESULTADO, CAIXA) |

### 📄 Fase 7 — Auditoria + PDF + PWA

| ID | Requisito |
|---|---|
| **RF-34** | Toda ação de escrita (create/update/delete) deve gerar registro em `audit_logs` com `user_id`, `entidade`, `acao`, `payload` (jsonb) |
| **RF-35** | A aba de Auditoria deve listar logs do workspace com filtro por usuário, entidade e período |
| **RF-36** | O usuário deve poder exportar relatório em PDF por período (gerado pelo FastAPI via WeasyPrint) |
| **RF-37** | O app deve ter manifest PWA + service worker + ícones (512x512, 192x192, maskable) |
| **RF-38** | O app deve ser instalável no Chrome mobile e desktop |
| **RF-39** | Cache estático (JS, CSS, ícones) deve funcionar offline; mutations exigem conexão (no MVP) |

### 🎨 Transversais

| ID | Requisito |
|---|---|
| **RF-40** | Dark theme local (preferência do dispositivo, não sincronizada) |
| **RF-41** | Categorias são persistidas por workspace e customizáveis (CRUD) |
| **RF-42** | Formato monetário: `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` |
| **RF-43** | Formato de data: `date-fns` com locale `pt-BR`, input `YYYY-MM-DD` (type=date) |

---

## 6. Requisitos Não-Funcionais (RNF)

| ID | Requisito |
|---|---|
| **RNF-01** | Stack frontend: React 18 + TypeScript + Vite + React Router + React Query + shadcn/ui + Tailwind + Recharts + React Hook Form + Zod + date-fns |
| **RNF-02** | Stack backend: FastAPI (Python 3.11+) + supabase-py (service_role) + Pydantic v2 + WeasyPrint + APScheduler |
| **RNF-03** | Supabase: Auth + Postgres 15+ + RLS + Storage + PostgREST |
| **RNF-04** | RLS habilitada em 100% das tabelas de domínio |
| **RNF-05** | Suite de testes de segurança: para cada tabela com `workspace_id`, testar que usuário de outro workspace recebe 0 linhas no SELECT e erro no INSERT/UPDATE/DELETE |
| **RNF-06** | Suite de testes unitários: cobertura mínima de 70% em FastAPI (pytest) |
| **RNF-07** | Lint: `ruff` + `mypy` no FastAPI; `eslint` + `tsc --noEmit` no frontend; `prettier` para formatação |
| **RNF-08** | CI: GitHub Actions executando lint + testes + build em PRs |
| **RNF-09** | Secrets: nunca commitar; usar `.env.example` + Supabase secrets para produção |
| **RNF-10** | Deploy inicial: Supabase managed; FastAPI em Fly.io ou Render; Frontend em Vercel ou Netlify (decisão no `/design`) |
| **RNF-11** | Performance: FCP < 2s em 3G; bundle inicial < 300KB gzip |
| **RNF-12** | Acessibilidade: componentes shadcn/Radix já A11y-ready; testar navegação por teclado e leitores de tela em fluxos críticos (login, criar transação) |
| **RNF-13** | Internacionalização: pt-BR hardcoded no MVP (sem i18n framework) |
| **RNF-14** | Logs estruturados no FastAPI (`structlog` ou similar) |
| **RNF-15** | Rate limiting no FastAPI para endpoints públicos (login, aceitar convite) — 60 req/min por IP |

---

## 7. User Stories com Critérios de Aceite

### US-01 — Criar conta e workspace (onboarding solo)
> **Como** usuário novo
> **Quero** criar uma conta e meu workspace
> **Para** começar a controlar minhas finanças

```gherkin
Cenário: Cadastro bem-sucedido via Google
  Dado que sou um usuário não cadastrado
  Quando clico em "Entrar com Google" e autorizo
  Então sou redirecionado para a tela "Criar seu primeiro workspace"
  E ao nomear "Finanças da Ana" e confirmar
  Então vejo o dashboard vazio com zero transações
  E existe um registro em `workspaces` com `owner_id = meu user_id`
  E existe um registro em `workspace_members` com `role = 'owner'`
```

### US-02 — Convidar cônjuge por email
> **Como** owner de um workspace
> **Quero** convidar minha esposa por email
> **Para** compartilhar o controle financeiro

```gherkin
Cenário: Convite enviado e aceito
  Dado que sou owner do workspace "Família Silva"
  Quando acesso "Membros" > "Convidar" e informo "ana@email.com"
  Então um registro é criado em `invites` com token único e `expires_at = now() + 7 days`
  E um email é enviado com link contendo o token
  Quando a Ana clica no link e faz login
  Então ela é adicionada a `workspace_members` com `role = 'editor'`
  E o convite tem `accepted_at` preenchido
  E ela vê todas as transações do workspace
```

### US-03 — Lançar gasto parcelado em cartão
> **Como** membro editor
> **Quero** lançar um gasto parcelado em 6x no cartão
> **Para** ver o impacto distribuído nos próximos 6 meses

```gherkin
Cenário: Gasto parcelado respeita dia de fechamento
  Dado que existe o cartão "Nubank" com `dia_fechamento = 5`
  E hoje é 2026-04-10
  Quando lanço gasto de R$ 600,00 em 6x no cartão "Nubank"
  Então são criadas 6 linhas em `transactions`
  E a parcela 1/6 tem `data` em maio/2026 (primeira fatura após fechamento)
  E a parcela 6/6 tem `data` em outubro/2026
  E cada linha tem `valor = 100.00`, `parcela_atual` de 1 a 6, `parcelas_total = 6`
```

### US-04 — Ver dashboard consolidado do mês
> **Como** usuário
> **Quero** ver entradas, saídas, resultado e caixa do mês
> **Para** entender minha situação financeira em segundos

```gherkin
Cenário: Dashboard do mês atual
  Dado que existem no mês atual: 2 entradas de R$ 5.000 e R$ 500, e 3 gastos de R$ 1.200, R$ 300, R$ 800
  Quando abro o app
  Então vejo card "Entradas" = R$ 5.500,00
  E card "Saídas" = R$ 2.300,00
  E card "Resultado" = R$ 3.200,00 (verde)
  E card "Caixa" = saldo acumulado até hoje
```

### US-05 — Tentar acessar workspace alheio (segurança)
> **Como** usuário mal-intencionado
> **Quero** acessar dados de outro workspace
> **Mas não devo conseguir** (teste de RLS)

```gherkin
Cenário: RLS bloqueia acesso cross-workspace
  Dado que o workspace A tem user_id `u1` e 5 transações
  E o workspace B tem user_id `u2` e 3 transações
  E `u2` NÃO é membro de A
  Quando `u2` faz GET /rest/v1/transactions?workspace_id=eq.<A>
  Então a resposta é HTTP 200 com array vazio []
  Quando `u2` tenta INSERT em transactions com workspace_id = <A>
  Então a resposta é HTTP 403 (RLS policy violation)
```

### US-06 — Exportar relatório em PDF
> **Como** usuário
> **Quero** exportar relatório do mês em PDF
> **Para** imprimir ou enviar por email

```gherkin
Cenário: Export PDF do mês atual
  Quando clico em "Exportar PDF" selecionando mês de abril/2026
  Então o frontend chama POST /reports/pdf do FastAPI com período
  E o FastAPI valida o JWT e checa membership no workspace
  E o FastAPI gera PDF via WeasyPrint com cabeçalho, dashboard, tabelas
  E o arquivo é baixado pelo usuário em < 10s
```

---

## 8. Restrições (Constraints)

| ID | Restrição |
|---|---|
| **C-01** | Stack **não negociável**: Supabase + FastAPI + React (definida pelo usuário) |
| **C-02** | Abordagem arquitetural: **Approach A** (Supabase-heavy + FastAPI fino) — validada no `/brainstorm` |
| **C-03** | RLS é a **linha primária** de defesa (não auth checks no app) |
| **C-04** | Workspace único compartilhado (todos os membros veem tudo) — não há distinção "pessoal vs familiar" dentro do workspace |
| **C-05** | Sem `localStorage` para dados financeiros |
| **C-06** | Sem Realtime no MVP (refresh via React Query) |
| **C-07** | PWA mínimo (instalável + cache estático); offline writes são v2 |
| **C-08** | pt-BR hardcoded; sem i18n framework |
| **C-09** | Valores monetários: `numeric(14,2)` no DB, `Intl.NumberFormat('pt-BR')` no frontend |

---

## 9. Out of Scope (YAGNI explícito)

Confirmado do BRAINSTORM e mantido:

| Item | Fase | Razão |
|---|---|---|
| Backup/restore manual via JSON | v2+ | Postgres já faz backup nativo; export CSV se houver demanda |
| Impressão HTML customizada com gradientes | v2+ | MVP usa PDF via WeasyPrint; HTML rico depois |
| Dark theme sincronizado no banco | v2+ | Preferência local no dispositivo |
| Supabase Realtime (subscriptions) | v2+ | Refresh manual via React Query cobre o MVP |
| Offline writes (PWA avançado) | v2+ | MVP só tem cache estático |
| Integração bancária (Open Finance / OFX) | v3+ | Arquitetura deixa espaço no FastAPI para futuro |
| Multi-idioma (i18n) | v2+ | pt-BR hardcoded no MVP |
| Alertas e notificações push | v2+ | Não requisitado |
| Categorização automática por ML | v3+ | Não requisitado |
| Divisão de transações entre membros (ex: "50% Ana, 50% Bruno") | v2+ | Workspace único não exige isso; dívidas entre membros cobrem o caso |

---

## 10. Suposições (Assumptions)

Inferências feitas sem re-perguntar ao usuário:

| # | Suposição | Fonte |
|---|---|---|
| A-01 | Personas Ana (gestora do lar) e Bruno (marido técnico) são inferidas como caso canônico de família brasileira | Contexto de "financeiro familiar" |
| A-02 | Categorias iniciais são seedadas ao criar workspace (alimentação, transporte, moradia, lazer, saúde, educação, outros; e para investimentos: renda fixa, renda variável, cripto, imóveis) | v1 tem `catGasto`/`catInv` inline |
| A-03 | Email de convite será enviado via Supabase Auth (`inviteUserByEmail`) ou SMTP externo via FastAPI | `/design` decide qual |
| A-04 | Deploy será managed (Supabase + Vercel + Fly.io/Render) — sem infra própria | RNF-10, decisão final no `/design` |
| A-05 | Uma pessoa pode ter múltiplos workspaces (ex: um pessoal + um da empresa), mas o MVP foca em 1 workspace por usuário | RF-10 |
| A-06 | Dashboard usa mês **vigente** por padrão; seletor de período altera para outros meses | RF-29, RF-32 |

---

## 11. Cobertura dos Requisitos nas User Stories

| User Story | Requisitos cobertos |
|---|---|
| US-01 | RF-01..05, SF-01 |
| US-02 | RF-06..08, SF-02 |
| US-03 | RF-11, RF-17..19 |
| US-04 | RF-29, SF-04 |
| US-05 | RNF-04, RNF-05, SNF-01 |
| US-06 | RF-36, SF-07 |

Outras US serão derivadas no `/design` para cobrir integralmente os RFs restantes.

---

## 12. Próximos Passos

```bash
/design .claude/sdd/features/DEFINE_CYT_FINANCE_V2.md
```

O `/design` deve produzir:
- Diagrama C4 (Context + Container)
- Schema SQL completo (CREATE TABLE + RLS policies)
- Estrutura de pastas (frontend + backend)
- Decisões de API (contratos REST + shapes)
- Plano de testes de segurança RLS
- Escolha final de hospedagem (Fly.io vs Render; Vercel vs Netlify)
- Fatiamento em fases executáveis com dependências

---

## Apêndice A — Quality Gate do Define

- [x] Problema claro e específico (seção 1)
- [x] Personas identificadas com dores (seção 2)
- [x] Sucesso mensurável (seção 4)
- [x] Acceptance tests testáveis (seção 7, formato Gherkin)
- [x] Out of scope explícito (seção 9)
- [x] Clarity Score ≥ 12/15 (obtido: 14/15)
