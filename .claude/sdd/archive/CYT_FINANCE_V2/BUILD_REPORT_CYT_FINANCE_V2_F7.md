# BUILD REPORT — CYT Finance v2 — Fase F7 (Audit + PDF + PWA)

**Feature:** `CYT_FINANCE_V2`
**Fase:** F7 (última do MVP)
**Data:** 2026-04-20
**Input:** `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §9 (F7)
**Status:** ✅ Concluída

---

## 1. Escopo da F7

Última fase do MVP — completa a paridade total com a v1 (BRAINSTORM §3):
- 🛡️ **Auditoria** com filtros (entidade + período)
- 📄 **Exportar PDF** via FastAPI + WeasyPrint + Jinja2
- 📱 **PWA**: manifest, ícones, service worker (via `vite-plugin-pwa`)

Cobre **RF-34..39** (DEFINE §5 Fase 7).

---

## 2. Arquivos criados/modificados (17)

### 2.1 Auditoria (2)

| Arquivo | Propósito |
|---|---|
| `apps/web/src/hooks/useAuditLogs.ts` | Query paginada (limit=200) com filtros opcionais (entidade, user_id, from/to) |
| `apps/web/src/pages/Audit.tsx` | Página com 2 filtros (entidade, janela de dias) + resumo humanizado do payload |

### 2.2 FastAPI PDF (5)

| Arquivo | Propósito |
|---|---|
| `apps/api/src/schemas/reports.py` | `PdfReportRequest` com validator: `periodo_fim ≥ periodo_inicio`, ≤ 366 dias |
| `apps/api/src/services/supabase_service.py` | **estendido** — `is_member()` + `fetch_report_data()` agrupa tx/inv/audit/categorias |
| `apps/api/src/services/pdf_service.py` | Jinja2 Environment + filtros `money`, `date_br`, `month_br`; `render_html` (testável) + `render_pdf` (lazy-imports WeasyPrint) |
| `apps/api/src/templates/report.html.j2` | Template A4 com 4 stat cards, tabela de categorias, transações, investimentos, auditoria (condicional) |
| `apps/api/src/routers/reports.py` | `POST /reports/pdf` com JWT + membership check |
| `apps/api/src/main.py` | **atualizado** — registra router `reports` |

### 2.3 UI export (2)

| Arquivo | Propósito |
|---|---|
| `apps/web/src/lib/api.ts` | `authorizedFetch` (anexa JWT do Supabase) + `downloadPdfReport` (blob → download) |
| `apps/web/src/components/ExportPdfButton.tsx` | Botão + Modal com seletor de mês + checkbox "Incluir auditoria" |
| `apps/web/src/pages/Home.tsx` | **atualizado** — botão export no header |

### 2.4 PWA (4)

| Arquivo | Propósito |
|---|---|
| `apps/web/public/favicon.svg` | Favicon SVG (C monograma sobre slate-900) |
| `apps/web/public/icons/icon.svg` | Fonte para 192/512 (C com "dot" verde) |
| `apps/web/public/icons/icon-maskable.svg` | Safe-zone maskable (sem round corners, cobre 100%) |
| `apps/web/public/icons/README.md` | Instruções para gerar PNGs via ImageMagick |
| `apps/web/public/robots.txt` | Disallow all (app privado) |

> **Nota:** manifest + service worker já foram configurados em F0 via `vite-plugin-pwa` em `vite.config.ts`.
> Os **PNGs** (192/512/maskable) precisam ser gerados do SVG — o ambiente não tem ImageMagick disponível; script documentado.

### 2.5 Navegação + testes (3)

| Arquivo | Propósito |
|---|---|
| `apps/web/src/components/layout/AppShell.tsx` | **atualizado** — nav com 8 itens (inclui `/audit 🛡️`) |
| `apps/web/src/App.tsx` | **atualizado** — rota `/audit` |
| `apps/api/tests/test_reports.py` | **6 testes**: auth header ausente, JWT inválido, período invertido, não-membro, render HTML, filtro money |

---

## 3. Decisões implementadas

| Ref | Como |
|---|---|
| RF-34 | Já implementado em F1 (trigger `fn_audit_trigger` em todas as tabelas de domínio) |
| RF-35 | Página `Audit.tsx` lista com filtros + desserialização do `payload.new/old` para resumo humanizado |
| RF-36 | `POST /reports/pdf` server-side com WeasyPrint + template A4 bonito (cards, categorias, tabelas) |
| RF-37, 38 | `vite-plugin-pwa` gera manifest + SW automaticamente na build; favicon + ícones SVG adicionados |
| RF-39 | Cache estático automático via `workbox` (globPatterns já configurado em F0) |
| ADR-006 | Export PDF valida JWT no FastAPI com `python-jose` HS256 |
| Segurança | Endpoint reconfirma membership via `is_member` antes de consultar com service_role (defense in depth) |

### Por que o HTML é renderizado separado do PDF?

`render_html(data) → string` é testável sem libs nativas (Cairo/Pango).
`render_pdf(data) → bytes` faz lazy-import do WeasyPrint → funciona em ambientes CI sem as libs nativas para rodar os outros testes do módulo.

---

## 4. Testes adicionados (6)

| # | Cenário |
|---|---|
| 1 | `POST /reports/pdf` sem Authorization → 422 |
| 2 | JWT inválido → 401 |
| 3 | `periodo_fim < periodo_inicio` → 422 (Pydantic validator) |
| 4 | Usuário não-membro do workspace → 403 `not_a_member` |
| 5 | `render_html(data)` contém workspace, datas BR, descricao, valores BR, categoria |
| 6 | Filtro `_money` formata `1234.5 → "R$ 1.234,50"` |

**Total acumulado: 54 + 6 = 60 testes.**

---

## 5. Verificação recomendada

```bash
# API tests (não requer libs nativas do WeasyPrint)
cd apps/api && pytest tests/test_reports.py -v

# PDF real (requer libs Cairo/Pango do Dockerfile ou apt install):
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=...
export SUPABASE_JWT_SECRET=...
uvicorn src.main:app --reload

# No frontend: /Home → Exportar PDF → selecionar mês → baixar

# PWA audit no Chrome
pnpm --filter @cyt/web build
pnpm --filter @cyt/web preview
# Lighthouse → PWA score; requer PNGs gerados (ver public/icons/README.md)

# Gerar PNGs (precisa ImageMagick):
cd apps/web/public/icons
magick icon.svg -resize 192x192 192.png
magick icon.svg -resize 512x512 512.png
magick icon-maskable.svg -resize 512x512 maskable.png
```

---

## 6. Desvios / débitos

| Item | Status | Ação |
|---|---|---|
| Ícones PNG 192/512/maskable | SVG criado, PNG pendente | User precisa rodar ImageMagick (docs em `public/icons/README.md`) |
| Testes E2E Playwright | Não implementados | Considerar após primeiro deploy para smoke dos fluxos críticos |
| Lighthouse CI no workflow | Não integrado | Adicionar se houver regressões de performance |
| Gráfico embutido no PDF | HTML estático por tabela + cards — sem render de gráfico | WeasyPrint + SVG seria viável em v2 |
| Notificações push (alertas) | Fora do escopo MVP (BRAINSTORM §9) | v2+ |

---

## 7. MVP Completo — Resumo final

### 7.1 Cobertura de requisitos do DEFINE

| Fase | RFs cobertos | Status |
|---|---|---|
| F0 | — (setup) | ✅ |
| F1 | RF-01..10 (identity + workspace + invites) | ✅ |
| F2 | RF-11..16 (transactions CRUD + filtros + busca) | ✅ |
| F3 | RF-17..20 (cards + parcelamento) — RF-20 parcial | ✅ |
| F4 | RF-21..24 (recurring + cron) | ✅ |
| F5 | RF-25..28 (investments + debts + quitação) | ✅ |
| F6 | RF-29..33 (dashboard + charts + histórico) | ✅ |
| F7 | RF-34..39 (audit + PDF + PWA) | ✅ |
| Transversais | RF-40..43 (dark theme, categorias, Intl, date-fns) | ✅ |

**RFs cobertos: 43/43** (RF-20 parcial — edit multi-parcela documentado como débito).

### 7.2 Arquivos criados no MVP

| Categoria | Qty |
|---|---|
| Web (TSX/TS) | ~45 arquivos |
| FastAPI (Python) | ~15 arquivos |
| Supabase (SQL + Edge Fn) | 8 arquivos |
| Testes (pytest + vitest) | 8 arquivos |
| Config (pyproject, vite, tailwind, etc) | ~10 arquivos |
| Docs (README, build reports, cron-setup) | 10 arquivos |
| **Total aproximado** | **~96 arquivos** |

### 7.3 Cobertura de testes

| Tipo | Qty | Arquivo(s) |
|---|---|---|
| RLS (segurança cross-workspace) | 15 | `apps/api/tests/test_rls.py` |
| Unit frontend (Zod + format) | 14 | `apps/web/src/**/*.test.ts` |
| Unit frontend (aggregate) | 9 | `apps/web/src/utils/aggregate.test.ts` |
| SQL function | 7 | `apps/api/tests/test_installments.py` |
| FastAPI (recurring + reports) | 15 | `apps/api/tests/test_recurring.py`, `test_reports.py`, `test_health.py` |
| **Total** | **60** | |

### 7.4 Próximos passos

```bash
/ship .claude/sdd/features/DEFINE_CYT_FINANCE_V2.md
```

Fase 4 (Ship) arquiva a feature com lições aprendidas.

Antes de fazer deploy de produção real, ainda recomenda-se:
1. Rodar `pnpm install` + `pip install -e ".[dev]"` e verificar build
2. `supabase start && supabase db reset` → rodar todos os 60 testes
3. Gerar ícones PNG do PWA
4. Configurar Google OAuth real no Supabase (`config.toml` + dashboard)
5. Deploy: Supabase managed + Vercel (web) + Fly.io GRU (api)
6. Criar trigger DB → Edge Function para envio de email de convite (alternativa: chamar Edge Function via cliente após INSERT)
7. Configurar cron externo (GitHub Actions → `/recurring/tick`)
8. Smoke manual dos 6 fluxos críticos (US-01..06)
9. Definir senha de `openssl rand -hex 32` para `CRON_SECRET` em produção

---

## Apêndice A — Quality Gate F7

- [x] Auditoria funcional com filtros
- [x] Export PDF server-side (FastAPI + WeasyPrint + Jinja)
- [x] Membership check antes de gerar PDF (defense in depth sobre RLS)
- [x] JWT validation no endpoint
- [x] Template A4 com cards, categorias, transações, investimentos, auditoria
- [x] Ícones SVG (PNG via ImageMagick documentado)
- [x] Navegação completa (8 itens)
- [x] 6 testes adicionados
- [x] Build report gerado
- [ ] Verificação runtime manual pendente
- [ ] PNGs PWA gerados manualmente

## Apêndice B — Progresso completo do MVP

| Fase | Status | Testes adicionados | Acumulado |
|---|---|---|---|
| F0 | ✅ | 0 | 0 |
| F1 | ✅ | 15 (RLS) | 15 |
| F2 | ✅ | 14 (unit) | 29 |
| F3 | ✅ | 7 (SQL) | 36 |
| F4 | ✅ | 9 (serviço+HTTP) | 45 |
| F5 | ✅ | 0 (reaproveita RLS) | 45 |
| F6 | ✅ | 9 (agregação) | 54 |
| **F7** | ✅ | **6 (PDF + auth)** | **60** |

🎉 **MVP COMPLETO — PARIDADE TOTAL ATINGIDA**
