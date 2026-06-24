# Dom Finance — Redesign dark premium + edição + agente de saúde financeira

> Spec de design. Data: 2026-06-24. Status: aprovada para planejamento.

## Contexto

App full-stack de finanças pessoais/familiares, hoje chamado **CYT Finance v2**, já
funcional:

- **Frontend**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + React Query + Recharts (`apps/web`).
- **Backend**: FastAPI (Python 3.11+) + APScheduler + supabase-py + WeasyPrint (`apps/api`).
- **Banco**: Supabase self-hosted (Postgres + RLS + Auth + Storage) via Docker Compose em `192.168.1.16`.

Telas existentes: Início (dashboard), Transações, Recorrentes, Investimentos, Dívidas,
Cartões, Auditoria, Membros. A camada de dados (hooks React Query) já tem `insert`,
`update` e `delete` para quase todas as entidades.

## Objetivo

Entregar, numa única spec (decisão explícita do usuário), cinco frentes:

1. **Rebrand** CYT Finance → **Dom Finance**.
2. **Design system dark premium** + redesign do shell e das 8 telas.
3. **Edição** via modal reusando os formulários existentes + botão excluir com confirmação.
4. **Dashboard renovado** apresentando dados que já existem no banco (patrimônio, contas
   a pagar, uso de cartões, investimentos & dívidas) + métricas objetivas de saúde financeira.
5. **Agente de saúde financeira** (FastAPI + LangChain + Claude + RAG sobre regras de
   educação financeira) que gera diagnóstico (score + pontos positivos/atenção/recomendações)
   e alimenta o dashboard.

## Decisões tomadas (do brainstorm)

| Tema | Decisão |
|---|---|
| Estilo visual | Dark dashboard premium (fundo escuro, acento/gradiente, gráficos com leve glow) |
| Escopo do redesign | Shell + todas as 8 telas |
| UX de edição | Modal reusando os forms existentes; excluir com confirmação |
| Dados extras no dashboard | Patrimônio líquido, contas a pagar/recorrentes, uso de cartões, investimentos & dívidas, saúde financeira |
| Saúde financeira | Agente IA incluído neste sub-projeto (não adiado) |
| Modelo do agente | Claude (Anthropic) via `langchain-anthropic` |
| Base do RAG | Regras/educação financeira (base curada) |
| Cadência do agente | Botão "Analisar agora" + cache; flag de desatualizado |
| Arquitetura do agente | Router novo na FastAPI existente; RAG via pgvector |

## Seção 1 — Rebrand

Substituir "CYT Finance" / "CYT" por **Dom Finance** em:

- `apps/web/src/components/layout/AppShell.tsx` (h1 da sidebar).
- `apps/web/index.html` (`<title>` e meta).
- `apps/web` manifest PWA (nome e short_name).
- `apps/web/package.json` e `package.json` raiz (campo name onde aplicável).
- `README.md` e strings remanescentes.

Sem mudança de lógica. Verificação: `grep -ri "cyt" apps/ README.md` sem resultados
de marca.

## Seção 2 — Design system dark premium

Hoje cores são classes cruas (`bg-white`, `slate-*`) espalhadas. Introduzir camada de
tokens para centralizar.

- **Tokens** (CSS variables, tema Tailwind `dark` como padrão): `--bg`, `--surface`,
  `--surface-2`, `--border`, `--text`, `--muted`, `--accent` (+ gradiente de acento),
  `--positive`, `--negative`, `--warn`.
- **Paleta base**: fundo `#0B0F17`, surface `#141A24`, surface-2 `#1B2330`, texto
  `#E6EAF0`, muted `#8A94A6`. Acento com gradiente (ajustável na implementação).
- **Componentes shadcn** padronizados: `Card`, `Button`, `Badge`, `Dialog` (Modal),
  `DropdownMenu`, `Progress`, `Tabs`.
- **Recharts** consome os tokens: eixos/grid em `--muted`/`--border`, séries em
  `--accent`/`--positive`/`--negative`, leve glow nos KPIs.
- **Acessibilidade**: contraste mínimo AA em texto e elementos interativos.

Tailwind `darkMode: 'class'` com `class="dark"` fixo no root (tema único dark nesta fase).

## Seção 3 — AppShell + 8 telas

- **Shell**: sidebar dark com marca Dom Finance, ícones `lucide-react` (substituindo
  emojis), seletor de workspace, item ativo com acento; bottom-nav mobile no mesmo tema.
- **Telas internas** (Transações, Recorrentes, Investimentos, Dívidas, Cartões,
  Auditoria, Membros): migram para tokens + `Card`/tabela padronizada. Conteúdo e dados
  inalterados; muda só a apresentação.

## Seção 4 — Edição (modal reusando forms)

- Cada linha/card ganha botão **Editar** → abre `Dialog` com o formulário existente
  preenchido.
- Forms passam a aceitar `initialValues?` + `mode: 'create' | 'edit'`; em `edit` chamam
  o hook `useUpdate*` correspondente.
- **Excluir** com confirmação (reusa `useDelete*`).
- Criar o hook faltante **`useUpdateInvestment`** (única entidade sem `update`).
- Entidades cobertas: transações, recorrentes, investimentos, dívidas, cartões.

## Seção 5 — Dashboard renovado

Layout em seções no tema dark, somando ao fluxo de caixa atual (entradas/saídas/
resultado/caixa + gráficos já existentes):

- **Patrimônio líquido**: total investido − total dívidas, com variação no tempo.
- **Contas a pagar**: próximos vencimentos = recorrentes do mês + parcelas de dívida +
  faturas de cartão.
- **Uso de cartões**: limite usado vs disponível por cartão (`Progress`) + fatura atual.
- **Investimentos & dívidas**: mini-painéis de composição/progresso.
- **Saúde Financeira**: card de score + painel "positivos / atenção / recomendações"
  (conteúdo do agente — Seção 6).
- **Métricas objetivas** (calculadas em Python, sempre visíveis, sem custo de LLM): taxa
  de poupança, comprometimento com dívida (% renda), utilização de cartão, meses de
  reserva de caixa.

A agregação de dados é centralizada num serviço reaproveitável (mesma fonte para os cards
e para o prompt do agente).

## Seção 6 — Agente de saúde financeira

### Localização
- `apps/api/src/routers/health.py` — endpoints.
- `apps/api/src/services/health_service.py` — orquestração (agregados + cache).
- `apps/api/src/services/agent/` — chain LangChain, retriever, prompts, schema de saída.
- `apps/api/src/schemas/health.py` — modelos Pydantic (entrada/saída).

### Modelo
Claude via `langchain-anthropic`. Model ID e custo confirmados na implementação via skill
`claude-api`. Chave em `ANTHROPIC_API_KEY` (config da API, não commitada).

### RAG
- Base curada de regras/educação financeira em tabela `health_kb` (pgvector).
- Embeddings por **modelo local** (sentence-transformers multilíngue, ex. família
  `multilingual-e5`/`bge-m3`) — evita uma segunda API paga. Modelo baixado uma vez no
  container da API.
- Base pequena, seedada por migration (regras: reserva de emergência 3–6 meses, 50/30/20,
  teto de comprometimento de renda com dívida, utilização saudável de cartão, etc.).

### Fluxo — `POST /workspaces/{id}/health-analysis`
1. Calcula os agregados do workspace/mês (reusa o serviço de agregação do dashboard).
2. Retriever puxa as regras relevantes do pgvector com base nos sinais calculados.
3. Chain LangChain: prompt(agregados + regras recuperadas) → Claude → **saída estruturada**
   validada por Pydantic:
   - `score`: inteiro 0–100
   - `nivel`: enum (`saudavel` | `atencao` | `critico`)
   - `positivos`: lista de strings
   - `atencao`: lista de strings
   - `recomendacoes`: lista de strings
4. Persiste em `health_reports` (workspace_id, mês, payload jsonb, generated_at).
5. Retorna o relatório ao frontend.

### Endpoints
- `POST /workspaces/{id}/health-analysis` — gera/regenera e cacheia.
- `GET /workspaces/{id}/health-analysis?mes=YYYY-MM` — retorna o cacheado (ou vazio +
  flag "nunca analisado").

### Cadência
Botão **"Analisar agora"** no dashboard; resultado cacheado em `health_reports`. Flag
`desatualizado` calculada quando há transações/alterações no mês posteriores ao
`generated_at`.

## Seção 7 — Modelo de dados (novas tabelas)

Migration nova em `supabase/migrations/`.

- **`health_kb`**: `id uuid pk`, `conteudo text`, `embedding vector`, `tags text[]`,
  `created_at`. RLS: leitura para usuários autenticados (conteúdo genérico, não sensível).
  Requer extensão `pgvector`.
- **`health_reports`**: `id uuid pk`, `workspace_id uuid fk`, `mes text` (YYYY-MM),
  `payload jsonb`, `generated_at timestamptz`. Unique (`workspace_id`, `mes`). RLS por
  membership do workspace (mesmo padrão das demais tabelas de domínio).

## Seção 8 — Erros e testes

### Tratamento de erros
- Falha do LLM/timeout → dashboard mostra as métricas determinísticas + estado "análise
  indisponível, tente novamente"; a home **nunca quebra**.
- RLS bloqueia acesso cross-workspace a `health_reports`.
- Validação Pydantic na saída do agente; se o JSON não validar, retorna erro tratado
  (sem persistir lixo).

### Testes
- **vitest** (web): form em modo edição (prefill + submit chama `useUpdate*`); render do
  dashboard com dados mock (cards novos); abertura/fechamento do modal.
- **pytest** (api): serviço de agregação; retriever (pgvector mockado/local); validação do
  schema de saída com o LLM mockado; flag de desatualizado.
- **RLS**: 1 teste garantindo isolamento de `health_reports` entre workspaces.

## Fora de escopo (próximos sub-projetos)

- **WhatsApp** (sub-projeto #5): agentes conversacionais via WhatsApp API ligados ao
  sistema. Depende deste agente existir; vira spec própria.
- Tema claro / toggle de tema (esta fase é dark único).
- Mudanças no schema de domínio existente além das duas tabelas novas.

## Riscos / atenção

- Escopo grande numa spec só (decisão explícita) — o plano de implementação deve fasear
  bem (rebrand+tokens → telas → edição → dashboard → agente).
- Requer `ANTHROPIC_API_KEY` no servidor.
- Embeddings locais exigem baixar o modelo uma vez no container da API (tamanho/RAM).
- Custo por token do Claude controlado pela cadência sob demanda + cache.
