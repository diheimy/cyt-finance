# Dom Finance — Redesign + Edição + Agente de Saúde Financeira — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear o app para Dom Finance, aplicar um design system dark premium em todo o app, adicionar edição via modal, enriquecer o dashboard com dados já existentes e adicionar um agente LangChain+Claude (RAG sobre regras financeiras) que gera diagnóstico de saúde financeira.

**Architecture:** Frontend React/Vite ganha uma camada de tokens (CSS variables + Tailwind dark) e componentes shadcn padronizados; os formulários existentes passam a operar em modo create/edit dentro de um `Dialog`. Um serviço de agregação (Python) calcula métricas determinísticas e alimenta tanto o dashboard quanto o prompt do agente. O agente vive num router novo da FastAPI existente, usa `langchain-anthropic` (Claude), recupera regras de uma base pgvector e persiste o relatório em `health_reports`.

**Tech Stack:** React 18 + TS + Vite + Tailwind (darkMode class) + shadcn/ui + Recharts + React Query + Vitest (web); FastAPI + LangChain + langchain-anthropic + sentence-transformers + pgvector + supabase-py + pytest (api).

**Spec:** `docs/superpowers/specs/2026-06-24-dom-finance-dark-redesign-health-agent-design.md`

**Nota de escopo:** Plano grande, organizado em 6 fases. Cada fase é entregável e testável sozinha; commite ao fim de cada tarefa. Branch já criada: `feat/dom-finance-redesign-health-agent`.

---

## Mapa de arquivos

**Fase 0 — Rebrand + tokens**
- Modify: `apps/web/index.html`, `apps/web/vite.config.ts` (manifest), `apps/web/src/components/layout/AppShell.tsx`, `apps/web/tailwind.config.ts`, `apps/web/src/styles/globals.css`, `README.md`, `apps/api/src/main.py`.

**Fase 1 — Primitivos shadcn + infra de edição**
- Create: `apps/web/src/components/ui/dialog.tsx`, `card.tsx`, `button.tsx`, `progress.tsx`, `badge.tsx`, `dropdown-menu.tsx`, `apps/web/src/lib/cn.ts`.
- Modify: `apps/web/src/components/Modal.tsx` (re-export do Dialog), `package.json` (deps shadcn).

**Fase 2 — Edição (modal reusando forms)**
- Modify cada form (`TransactionForm`, `RecurringForm`, `InvestmentForm`, `DebtForm`, `CardForm`) para aceitar `mode`/`initialValues`.
- Modify `apps/web/src/hooks/useInvestments.ts` (+`useUpdateInvestment`).
- Create: `apps/web/src/components/RowActions.tsx`.
- Modify páginas: `Transactions.tsx`, `Recurring.tsx`, `Investments.tsx`, `Debts.tsx`, `Cards.tsx`.
- Test: `apps/web/src/components/forms/*.test.tsx`, `RowActions.test.tsx`.

**Fase 3 — Agregação + métricas determinísticas (web)**
- Create: `apps/web/src/utils/health-metrics.ts`, `apps/web/src/hooks/useNetWorth.ts`, `useUpcomingBills.ts`, `useCardUsage.ts`.
- Create componentes dashboard: `apps/web/src/components/dashboard/NetWorthCard.tsx`, `UpcomingBills.tsx`, `CardUsage.tsx`, `HealthMetrics.tsx`.
- Modify: `apps/web/src/pages/Home.tsx`.
- Test: `apps/web/src/utils/health-metrics.test.ts`.

**Fase 4 — Agente de saúde (api)**
- Create migration: `supabase/migrations/20260624000001_health.sql`.
- Create: `apps/api/src/schemas/health_report.py`, `apps/api/src/services/health/aggregate.py`, `embeddings.py`, `retriever.py`, `agent.py`, `report_service.py`, `apps/api/src/routers/health_report.py`.
- Modify: `apps/api/src/main.py`, `apps/api/src/config.py`, `apps/api/pyproject.toml`.
- Test: `apps/api/tests/test_health_aggregate.py`, `test_health_agent.py`, `test_health_report_endpoint.py`.

**Fase 5 — Card de saúde no dashboard + integração**
- Create: `apps/web/src/hooks/useHealthReport.ts`, `apps/web/src/components/dashboard/HealthCard.tsx`.
- Modify: `apps/web/src/pages/Home.tsx`.
- Test: `apps/web/src/components/dashboard/HealthCard.test.tsx`.

---

## FASE 0 — Rebrand + design tokens

### Task 0.1: Tokens de cor dark no Tailwind + globals

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/styles/globals.css`

- [ ] **Step 1: Adicionar tokens semânticos ao tailwind**

Em `apps/web/tailwind.config.ts`, dentro de `theme.extend.colors`, somar aos `brand` existentes:

```ts
colors: {
  brand: {
    green: '#10b981', red: '#ef4444', blue: '#3b82f6',
    yellow: '#f59e0b', purple: '#8b5cf6'
  },
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  'surface-2': 'var(--surface-2)',
  border: 'var(--border)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  accent: 'var(--accent)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
  warn: 'var(--warn)'
}
```

- [ ] **Step 2: Definir as variáveis no globals.css**

No topo de `apps/web/src/styles/globals.css`, antes das diretivas `@tailwind`, adicionar:

```css
:root {
  --bg: #0b0f17;
  --surface: #141a24;
  --surface-2: #1b2330;
  --border: #26303f;
  --text: #e6eaf0;
  --muted: #8a94a6;
  --accent: #6366f1;
  --accent-grad: linear-gradient(135deg, #6366f1 0%, #22d3ee 100%);
  --positive: #34d399;
  --negative: #f87171;
  --warn: #fbbf24;
}
html { color-scheme: dark; }
body { background: var(--bg); color: var(--text); }
```

- [ ] **Step 3: Fixar tema dark no root**

Em `apps/web/index.html`, mudar `<html lang="pt-BR">` para `<html lang="pt-BR" class="dark">`.

- [ ] **Step 4: Verificar build**

Run: `pnpm --filter web build`
Expected: build sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/styles/globals.css apps/web/index.html
git commit -m "feat(ui): add dark design tokens"
```

### Task 0.2: Rebrand CYT Finance → Dom Finance

**Files:**
- Modify: `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/src/components/layout/AppShell.tsx`, `apps/api/src/main.py`, `README.md`

- [ ] **Step 1: Trocar título e meta no index.html**

Em `apps/web/index.html`: `<title>Dom Finance</title>` e `<meta name="theme-color" content="#0b0f17" />`.

- [ ] **Step 2: Trocar manifest PWA**

Em `apps/web/vite.config.ts`, no objeto `manifest`: `name: 'Dom Finance'`, `short_name: 'Dom'`, `theme_color: '#0b0f17'`, `background_color: '#0b0f17'`.

- [ ] **Step 3: Trocar marca na sidebar**

Em `apps/web/src/components/layout/AppShell.tsx`, linha do h1: `<h1 className="font-display text-2xl mb-1">Dom Finance</h1>`.

- [ ] **Step 4: Trocar título da API e README**

Em `apps/api/src/main.py`: `title="Dom Finance API"`. Em `README.md`: primeira linha `# Dom Finance` e substituir menções "CYT Finance".

- [ ] **Step 5: Verificar que não sobrou marca antiga**

Run: `grep -rin "cyt finance" apps/ README.md`
Expected: nenhum resultado (nomes de arquivo/pacote técnicos `cyt-finance-api` podem ficar; só a marca visível muda).

- [ ] **Step 6: Commit**

```bash
git add apps/web/index.html apps/web/vite.config.ts apps/web/src/components/layout/AppShell.tsx apps/api/src/main.py README.md
git commit -m "feat: rebrand CYT Finance to Dom Finance"
```

---

## FASE 1 — Primitivos shadcn + infra de edição

### Task 1.1: Helper `cn` + dependências

**Files:**
- Create: `apps/web/src/lib/cn.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Instalar deps**

Run: `pnpm --filter web add class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-progress`
Expected: deps adicionadas ao `apps/web/package.json`.

- [ ] **Step 2: Criar helper cn**

`apps/web/src/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/src/lib/cn.ts pnpm-lock.yaml
git commit -m "chore(web): add shadcn primitive deps + cn helper"
```

### Task 1.2: Card, Button, Badge, Progress (tokens dark)

**Files:**
- Create: `apps/web/src/components/ui/card.tsx`, `button.tsx`, `badge.tsx`, `progress.tsx`

- [ ] **Step 1: Card**

`apps/web/src/components/ui/card.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-4 md:p-6', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 font-semibold text-text">{children}</h2>;
}
```

- [ ] **Step 2: Button**

`apps/web/src/components/ui/button.tsx`:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:opacity-90',
        outline: 'border border-border text-text hover:bg-surface-2',
        ghost: 'text-muted hover:text-text hover:bg-surface-2',
        danger: 'bg-negative text-white hover:opacity-90'
      },
      size: { sm: 'px-3 py-1.5', md: 'px-4 py-2' }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export function Button({ className, variant, size, ...rest }: Props) {
  return <button className={cn(button({ variant, size }), className)} {...rest} />;
}
```

- [ ] **Step 3: Badge**

`apps/web/src/components/ui/badge.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const tones = {
  positive: 'bg-positive/15 text-positive',
  negative: 'bg-negative/15 text-negative',
  warn: 'bg-warn/15 text-warn',
  neutral: 'bg-surface-2 text-muted'
} as const;

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}
```

- [ ] **Step 4: Progress**

`apps/web/src/components/ui/progress.tsx`:

```tsx
import { cn } from '@/lib/cn';

export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm --filter web typecheck` → PASS

```bash
git add apps/web/src/components/ui/
git commit -m "feat(ui): Card, Button, Badge, Progress primitives"
```

### Task 1.3: Dialog acessível + Modal compat

**Files:**
- Create: `apps/web/src/components/ui/dialog.tsx`
- Modify: `apps/web/src/components/Modal.tsx`

- [ ] **Step 1: Dialog sobre radix**

`apps/web/src/components/ui/dialog.tsx`:

```tsx
import * as RD from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export function Dialog({
  open,
  onOpenChange,
  title,
  children
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <RD.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 max-h-[90vh] overflow-y-auto">
          {title && <RD.Title className="mb-4 font-display text-xl text-text">{title}</RD.Title>}
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
```

- [ ] **Step 2: Manter Modal como wrapper (não quebrar usos existentes)**

Reescrever `apps/web/src/components/Modal.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} title={title}>
      {children}
    </Dialog>
  );
}
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build` → PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/dialog.tsx apps/web/src/components/Modal.tsx
git commit -m "feat(ui): accessible Dialog + Modal compat wrapper"
```

---

## FASE 2 — Edição (modal reusando forms)

### Task 2.1: Hook `useUpdateInvestment` (lacuna)

**Files:**
- Modify: `apps/web/src/hooks/useInvestments.ts`
- Test: `apps/web/src/hooks/useInvestments.test.ts`

- [ ] **Step 1: Teste falhando**

`apps/web/src/hooks/useInvestments.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as hooks from './useInvestments';

describe('useInvestments module', () => {
  it('exporta useUpdateInvestment', () => {
    expect(typeof hooks.useUpdateInvestment).toBe('function');
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `pnpm --filter web test -- useInvestments`
Expected: FAIL (`useUpdateInvestment` undefined).

- [ ] **Step 3: Implementar o hook**

Adicionar em `apps/web/src/hooks/useInvestments.ts` (após `useCreateInvestment`):

```ts
export function useUpdateInvestment(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch
    }: {
      id: string;
      patch: Partial<Omit<InvestmentInput, 'workspace_id'>>;
    }) => {
      const { data, error } = await supabase
        .from('investments')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments', workspaceId] })
  });
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `pnpm --filter web test -- useInvestments`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useInvestments.ts apps/web/src/hooks/useInvestments.test.ts
git commit -m "feat(web): add useUpdateInvestment hook"
```

### Task 2.2: `TransactionForm` em modo create/edit

**Files:**
- Modify: `apps/web/src/components/forms/TransactionForm.tsx`
- Test: `apps/web/src/components/forms/TransactionForm.test.tsx`

- [ ] **Step 1: Teste falhando (prefill em modo edit)**

`apps/web/src/components/forms/TransactionForm.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionForm from './TransactionForm';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('TransactionForm edit mode', () => {
  it('pré-preenche descrição quando recebe initialValues', () => {
    wrap(
      <TransactionForm
        workspaceId="ws-1"
        mode="edit"
        initialValues={{ id: 'tx-1', tipo: 'gasto', valor: 12.5, descricao: 'Mercado', data: '2026-06-01', categoria_id: null }}
      />
    );
    expect(screen.getByDisplayValue('Mercado')).toBeInTheDocument();
  });
});
```

(Se faltar `@testing-library/react`/`jest-dom`, instalar: `pnpm --filter web add -D @testing-library/react @testing-library/jest-dom` e garantir import em `src/test/setup.ts`: `import '@testing-library/jest-dom';`)

- [ ] **Step 2: Rodar — deve falhar**

Run: `pnpm --filter web test -- TransactionForm`
Expected: FAIL (prop `mode`/`initialValues` não existe).

- [ ] **Step 3: Implementar create/edit**

Em `apps/web/src/components/forms/TransactionForm.tsx`, alterar a interface e a inicialização de estado, e o submit:

```tsx
import { useUpdateTransaction } from '@/hooks/useTransactions';

export interface TransactionEditValues {
  id: string;
  tipo: TransactionKind;
  valor: number;
  descricao: string;
  data: string;
  categoria_id: string | null;
}

interface Props {
  workspaceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultKind?: TransactionKind;
  mode?: 'create' | 'edit';
  initialValues?: TransactionEditValues;
}

export default function TransactionForm({
  workspaceId, onSuccess, onCancel, defaultKind = 'gasto',
  mode = 'create', initialValues
}: Props) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<TransactionKind>(initialValues?.tipo ?? defaultKind);
  const [valor, setValor] = useState(initialValues ? String(initialValues.valor).replace('.', ',') : '');
  const [descricao, setDescricao] = useState(initialValues?.descricao ?? '');
  const [data, setData] = useState(initialValues?.data ?? todayISO());
  const [categoriaId, setCategoriaId] = useState<string>(initialValues?.categoria_id ?? '');
  const [error, setError] = useState<string | null>(null);

  const cats = useCategories(workspaceId, tipo);
  const createTx = useCreateTransaction(workspaceId);
  const updateTx = useUpdateTransaction(workspaceId);
  const pending = createTx.isPending || updateTx.isPending;
```

No `submit`, após montar `input`, ramificar:

```tsx
      if (mode === 'edit' && initialValues) {
        const { workspace_id: _ws, ...patch } = input;
        await updateTx.mutateAsync({ id: initialValues.id, patch });
      } else {
        await createTx.mutateAsync({ ...input, created_by: user.id });
      }
      onSuccess?.();
```

Trocar `disabled={createTx.isPending}` e o label do botão para usar `pending`.

- [ ] **Step 4: Rodar — deve passar**

Run: `pnpm --filter web test -- TransactionForm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/forms/TransactionForm.tsx apps/web/src/components/forms/TransactionForm.test.tsx apps/web/src/test/setup.ts apps/web/package.json
git commit -m "feat(web): TransactionForm edit mode"
```

### Task 2.3: Mesmo padrão para Recurring/Investment/Debt/Card forms

Aplicar exatamente o padrão da Task 2.2 a cada form. Para cada um: adicionar `mode`/`initialValues`, inicializar estado a partir de `initialValues`, importar o `useUpdate*` correspondente (`useUpdateRecurring`, `useUpdateInvestment`, `useUpdateDebt`, `useUpdateCard`) e ramificar o submit entre create/update. `InvestmentForm` usa o hook criado na Task 2.1.

- [ ] **Step 1: RecurringForm** — `initialValues` com os campos do `RecurringInput`; submit chama `useUpdateRecurring().mutateAsync({ id, patch })`.
- [ ] **Step 2: InvestmentForm** — `initialValues: { id, valor, descricao, categoria, data }`; submit chama `useUpdateInvestment`.
- [ ] **Step 3: DebtForm** — `initialValues` com campos de `DebtInput`; submit chama `useUpdateDebt`.
- [ ] **Step 4: CardForm** — `initialValues` com campos de `CardInput`; submit chama `useUpdateCard`.
- [ ] **Step 5: Typecheck**

Run: `pnpm --filter web typecheck` → PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/forms/
git commit -m "feat(web): edit mode for recurring/investment/debt/card forms"
```

### Task 2.4: `RowActions` (Editar/Excluir)

**Files:**
- Create: `apps/web/src/components/RowActions.tsx`
- Test: `apps/web/src/components/RowActions.test.tsx`

- [ ] **Step 1: Teste falhando**

`apps/web/src/components/RowActions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RowActions } from './RowActions';

describe('RowActions', () => {
  it('chama onEdit ao clicar em Editar', () => {
    const onEdit = vi.fn();
    render(<RowActions onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Editar'));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('pede confirmação antes de excluir', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RowActions onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Excluir'));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `pnpm --filter web test -- RowActions`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

`apps/web/src/components/RowActions.tsx`:

```tsx
import { Pencil, Trash2 } from 'lucide-react';

export function RowActions({
  onEdit,
  onDelete,
  confirmText = 'Excluir este item?'
}: {
  onEdit: () => void;
  onDelete: () => void;
  confirmText?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Editar" onClick={onEdit} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text">
        <Pencil size={16} />
      </button>
      <button
        aria-label="Excluir"
        onClick={() => { if (window.confirm(confirmText)) onDelete(); }}
        className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-negative"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `pnpm --filter web test -- RowActions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/RowActions.tsx apps/web/src/components/RowActions.test.tsx
git commit -m "feat(web): RowActions edit/delete component"
```

### Task 2.5: Ligar RowActions + modal de edição nas 5 páginas

Em cada página de lista, para cada item renderizar `<RowActions onEdit={...} onDelete={...} />`, manter no estado o item em edição (`const [editing, setEditing] = useState<Row | null>(null)`) e abrir o form em `Dialog`/`Modal` com `mode="edit"` e `initialValues` mapeados do item; `onDelete` chama o `useDelete*` correspondente.

- [ ] **Step 1: Transactions.tsx** — usa `useDeleteTransaction`; `initialValues` mapeados de `TxRelations`.
- [ ] **Step 2: Recurring.tsx** — `useDeleteRecurring`.
- [ ] **Step 3: Investments.tsx** — `useDeleteInvestment`.
- [ ] **Step 4: Debts.tsx** — `useDeleteDebt`.
- [ ] **Step 5: Cards.tsx** — `useDeleteCard`.
- [ ] **Step 6: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/
git commit -m "feat(web): wire edit modal + delete into list pages"
```

---

## FASE 3 — Dashboard enriquecido (dados existentes)

### Task 3.1: Métricas determinísticas (puro, testável)

**Files:**
- Create: `apps/web/src/utils/health-metrics.ts`
- Test: `apps/web/src/utils/health-metrics.test.ts`

- [ ] **Step 1: Teste falhando**

`apps/web/src/utils/health-metrics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { savingsRate, debtBurden, cardUtilization } from './health-metrics';

describe('health-metrics', () => {
  it('savingsRate = (entradas - saidas) / entradas', () => {
    expect(savingsRate(1000, 700)).toBeCloseTo(0.3);
  });
  it('savingsRate 0 quando entradas = 0', () => {
    expect(savingsRate(0, 100)).toBe(0);
  });
  it('debtBurden = parcelasMensais / renda', () => {
    expect(debtBurden(300, 1500)).toBeCloseTo(0.2);
  });
  it('cardUtilization = usado / limite', () => {
    expect(cardUtilization(400, 1000)).toBeCloseTo(0.4);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `pnpm --filter web test -- health-metrics`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`apps/web/src/utils/health-metrics.ts`:

```ts
export function savingsRate(entradas: number, saidas: number): number {
  if (entradas <= 0) return 0;
  return (entradas - saidas) / entradas;
}

export function debtBurden(parcelasMensais: number, renda: number): number {
  if (renda <= 0) return 0;
  return parcelasMensais / renda;
}

export function cardUtilization(usado: number, limite: number): number {
  if (limite <= 0) return 0;
  return usado / limite;
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `pnpm --filter web test -- health-metrics`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/utils/health-metrics.ts apps/web/src/utils/health-metrics.test.ts
git commit -m "feat(web): deterministic financial health metrics"
```

### Task 3.2: Hooks de net worth, contas a pagar, uso de cartões

**Files:**
- Create: `apps/web/src/hooks/useNetWorth.ts`, `useUpcomingBills.ts`, `useCardUsage.ts`

- [ ] **Step 1: useNetWorth** — soma `investments.valor` − soma `debts.saldo` (reusa `useInvestments` e `useDebts`); retorna `{ investido, dividas, patrimonio }`.

```ts
import { useInvestments } from '@/hooks/useInvestments';
import { useDebts } from '@/hooks/useDebts';

export function useNetWorth(workspaceId: string | undefined) {
  const inv = useInvestments(workspaceId);
  const debts = useDebts(workspaceId);
  const investido = (inv.data ?? []).reduce((s, i) => s + Number(i.valor), 0);
  const dividas = (debts.data ?? []).reduce((s, d) => s + Number((d as { saldo?: number }).saldo ?? 0), 0);
  return { investido, dividas, patrimonio: investido - dividas, isLoading: inv.isLoading || debts.isLoading };
}
```

(Conferir o nome real do campo de saldo em `useDebts`/`DebtRow` e ajustar.)

- [ ] **Step 2: useUpcomingBills** — junta recorrentes do mês + parcelas de dívida + faturas de cartão num array ordenado por data de vencimento. Reusa `useRecurring`, `useDebts`, `useCards`/`useInstallments`. Retorna `{ items: { id, label, valor, vencimento, origem }[] }`.

- [ ] **Step 3: useCardUsage** — para cada cartão, `{ nome, limite, usado, utilizacao }` usando `useCards` + `useInstallments`/transações com `cartao_id`.

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm --filter web typecheck` → PASS

```bash
git add apps/web/src/hooks/useNetWorth.ts apps/web/src/hooks/useUpcomingBills.ts apps/web/src/hooks/useCardUsage.ts
git commit -m "feat(web): dashboard aggregation hooks"
```

### Task 3.3: Componentes de dashboard + integração na Home

**Files:**
- Create: `apps/web/src/components/dashboard/NetWorthCard.tsx`, `UpcomingBills.tsx`, `CardUsage.tsx`, `HealthMetrics.tsx`
- Modify: `apps/web/src/pages/Home.tsx`

- [ ] **Step 1: NetWorthCard** — `Card` com patrimônio (verde/vermelho via tokens), e duas linhas (investido / dívidas) usando `formatMoney`.
- [ ] **Step 2: UpcomingBills** — `Card` com lista dos próximos vencimentos (`Badge` de origem, valor, data).
- [ ] **Step 3: CardUsage** — `Card` com um `Progress` por cartão (`utilizacao*100`), label limite/usado.
- [ ] **Step 4: HealthMetrics** — `Card` com taxa de poupança, comprometimento, utilização de cartão, meses de reserva (de `health-metrics` + dados dos hooks), cada um com `Badge` tone positivo/atenção por faixa.
- [ ] **Step 5: Migrar Home.tsx para tokens + novos cards** — substituir `StatCard`/`Panel` internos para usar `Card`/`CardTitle` e classes de token (`bg-surface`, `text-text`, etc.), e inserir `<NetWorthCard/>`, `<HealthMetrics/>`, `<CardUsage/>`, `<UpcomingBills/>` no grid. Trocar o emoji 🛡️ por ícone lucide.
- [ ] **Step 6: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web build` → PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/dashboard/ apps/web/src/pages/Home.tsx
git commit -m "feat(web): enriched dark dashboard with net worth, bills, card usage, metrics"
```

### Task 3.4: Migrar telas internas para tokens

Para cada página interna (Transactions, Recurring, Investments, Debts, Cards, Audit, Members), substituir cores hardcoded (`bg-white`, `text-slate-*`, `border-slate-*`) por classes de token (`bg-surface`, `text-text`, `text-muted`, `border-border`) e envolver blocos em `Card`. Sem mudar dados/lógica.

- [ ] **Step 1..7:** uma página por step, na ordem acima.
- [ ] **Step 8: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web build` → PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pages/
git commit -m "feat(web): migrate all screens to dark tokens"
```

---

## FASE 4 — Agente de saúde financeira (FastAPI + LangChain + Claude + RAG)

> **Antes de codar o cliente Claude:** consultar a skill `claude-api` para fixar o model ID atual (família Claude), parâmetros e custo. Usar esse model ID em `agent.py`.

### Task 4.1: Migration — pgvector + tabelas

**Files:**
- Create: `supabase/migrations/20260624000001_health.sql`

- [ ] **Step 1: Escrever a migration**

```sql
create extension if not exists vector;

create table public.health_kb (
  id uuid primary key default gen_random_uuid(),
  conteudo text not null,
  tags text[] not null default '{}',
  embedding vector(384),
  created_at timestamptz not null default now()
);
alter table public.health_kb enable row level security;
create policy health_kb_read on public.health_kb
  for select to authenticated using (true);

create table public.health_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  mes text not null,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  unique (workspace_id, mes)
);
alter table public.health_reports enable row level security;
create policy health_reports_member on public.health_reports
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.workspace_id = health_reports.workspace_id and m.user_id = auth.uid()
  ));
```

(Conferir o nome real da tabela de membership em migrations existentes — `memberships` vs `workspace_members` — e ajustar o `using`. A dimensão `vector(384)` casa com `multilingual-e5-small`; ajustar se usar outro modelo.)

- [ ] **Step 2: Aplicar e validar**

Run: `pnpm db:reset` (ou `supabase db reset`)
Expected: migration aplica sem erro; `\d public.health_reports` mostra a tabela.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260624000001_health.sql
git commit -m "feat(db): health_kb + health_reports tables with pgvector + RLS"
```

### Task 4.2: Dependências + config da API

**Files:**
- Modify: `apps/api/pyproject.toml`, `apps/api/src/config.py`

- [ ] **Step 1: Adicionar deps**

Em `apps/api/pyproject.toml`, somar a `dependencies`:

```
    "langchain>=0.3.0",
    "langchain-anthropic>=0.2.0",
    "sentence-transformers>=3.0.0",
```

- [ ] **Step 2: Config — chave Claude**

Em `apps/api/src/config.py`, adicionar ao `Settings`:

```python
    anthropic_api_key: str = ""
    health_model: str = "claude-3-5-sonnet-latest"  # confirmar via skill claude-api
    embed_model: str = "intfloat/multilingual-e5-small"
```

- [ ] **Step 3: Instalar**

Run: `cd apps/api && pip install -e ".[dev]"`
Expected: instala sem erro.

- [ ] **Step 4: Commit**

```bash
git add apps/api/pyproject.toml apps/api/src/config.py
git commit -m "chore(api): add langchain + claude + embeddings config"
```

### Task 4.3: Schema Pydantic da saída do agente

**Files:**
- Create: `apps/api/src/schemas/health_report.py`
- Test: `apps/api/tests/test_health_schema.py`

- [ ] **Step 1: Teste falhando**

`apps/api/tests/test_health_schema.py`:

```python
from src.schemas.health_report import HealthReport

def test_health_report_valid():
    r = HealthReport(
        score=72, nivel="atencao",
        positivos=["Boa taxa de poupança"],
        atencao=["Cartão acima de 50%"],
        recomendacoes=["Reduzir uso do cartão"],
    )
    assert r.score == 72
    assert r.nivel == "atencao"
```

- [ ] **Step 2: Rodar — falha**

Run: `cd apps/api && pytest tests/test_health_schema.py -v`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

`apps/api/src/schemas/health_report.py`:

```python
from typing import Literal

from pydantic import BaseModel, Field


class HealthReport(BaseModel):
    score: int = Field(ge=0, le=100)
    nivel: Literal["saudavel", "atencao", "critico"]
    positivos: list[str]
    atencao: list[str]
    recomendacoes: list[str]


class HealthAnalysisRequest(BaseModel):
    workspace_id: str
    mes: str  # YYYY-MM
```

- [ ] **Step 4: Rodar — passa**

Run: `cd apps/api && pytest tests/test_health_schema.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/schemas/health_report.py apps/api/tests/test_health_schema.py
git commit -m "feat(api): HealthReport pydantic schema"
```

### Task 4.4: Serviço de agregação (Python)

**Files:**
- Create: `apps/api/src/services/health/__init__.py`, `apps/api/src/services/health/aggregate.py`
- Test: `apps/api/tests/test_health_aggregate.py`

- [ ] **Step 1: Teste falhando**

`apps/api/tests/test_health_aggregate.py`:

```python
from src.services.health.aggregate import compute_signals

def test_compute_signals_basic():
    txs = [
        {"tipo": "entrada", "valor": 5000, "data": "2026-06-05"},
        {"tipo": "gasto", "valor": 3000, "data": "2026-06-10"},
    ]
    s = compute_signals(txs, investido=10000, dividas=2000, parcelas_mensais=500)
    assert s["entradas"] == 5000
    assert s["saidas"] == 3000
    assert round(s["taxa_poupanca"], 2) == 0.40
    assert round(s["comprometimento"], 2) == 0.10
    assert s["patrimonio"] == 8000
```

- [ ] **Step 2: Rodar — falha**

Run: `cd apps/api && pytest tests/test_health_aggregate.py -v`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`apps/api/src/services/health/__init__.py`: vazio.
`apps/api/src/services/health/aggregate.py`:

```python
from collections.abc import Iterable
from typing import Any


def compute_signals(
    txs: Iterable[dict[str, Any]],
    *,
    investido: float,
    dividas: float,
    parcelas_mensais: float,
) -> dict[str, float]:
    entradas = sum(float(t["valor"]) for t in txs if t["tipo"] == "entrada")
    saidas = sum(float(t["valor"]) for t in txs if t["tipo"] == "gasto")
    taxa_poupanca = (entradas - saidas) / entradas if entradas > 0 else 0.0
    comprometimento = parcelas_mensais / entradas if entradas > 0 else 0.0
    return {
        "entradas": entradas,
        "saidas": saidas,
        "taxa_poupanca": taxa_poupanca,
        "comprometimento": comprometimento,
        "patrimonio": investido - dividas,
        "investido": investido,
        "dividas": dividas,
    }
```

- [ ] **Step 4: Rodar — passa**

Run: `cd apps/api && pytest tests/test_health_aggregate.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/health/__init__.py apps/api/src/services/health/aggregate.py apps/api/tests/test_health_aggregate.py
git commit -m "feat(api): financial signals aggregation"
```

### Task 4.5: Embeddings + retriever pgvector

**Files:**
- Create: `apps/api/src/services/health/embeddings.py`, `apps/api/src/services/health/retriever.py`

- [ ] **Step 1: embeddings.py — modelo local, lazy-load**

```python
from functools import lru_cache

from sentence_transformers import SentenceTransformer

from src.config import settings


@lru_cache(maxsize=1)
def _model() -> SentenceTransformer:
    return SentenceTransformer(settings.embed_model)


def embed(text: str) -> list[float]:
    return _model().encode(text, normalize_embeddings=True).tolist()
```

- [ ] **Step 2: retriever.py — busca por similaridade no pgvector**

```python
from typing import Any

from src.services.health.embeddings import embed


def retrieve_rules(client: Any, query: str, k: int = 4) -> list[str]:
    vec = embed(query)
    res = client.rpc("match_health_kb", {"query_embedding": vec, "match_count": k}).execute()
    return [row["conteudo"] for row in (res.data or [])]
```

- [ ] **Step 3: Adicionar RPC `match_health_kb` à migration da Task 4.1** (voltar e somar):

```sql
create or replace function public.match_health_kb(query_embedding vector(384), match_count int)
returns table (id uuid, conteudo text, similarity float)
language sql stable as $$
  select id, conteudo, 1 - (embedding <=> query_embedding) as similarity
  from public.health_kb
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

Reaplicar: `pnpm db:reset`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/health/embeddings.py apps/api/src/services/health/retriever.py supabase/migrations/20260624000001_health.sql
git commit -m "feat(api): local embeddings + pgvector retriever"
```

### Task 4.6: Chain LangChain (Claude) com saída estruturada

**Files:**
- Create: `apps/api/src/services/health/agent.py`
- Test: `apps/api/tests/test_health_agent.py`

- [ ] **Step 1: Teste falhando (LLM mockado)**

`apps/api/tests/test_health_agent.py`:

```python
from unittest.mock import patch

from src.schemas.health_report import HealthReport
from src.services.health import agent as agent_mod


def test_analyze_parses_structured_output():
    fake = HealthReport(score=80, nivel="saudavel", positivos=["ok"], atencao=[], recomendacoes=["manter"])
    with patch.object(agent_mod, "_invoke_llm", return_value=fake):
        out = agent_mod.analyze(signals={"taxa_poupanca": 0.4}, rules=["reserva 3-6 meses"])
    assert isinstance(out, HealthReport)
    assert out.score == 80
```

- [ ] **Step 2: Rodar — falha**

Run: `cd apps/api && pytest tests/test_health_agent.py -v`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`apps/api/src/services/health/agent.py`:

```python
from typing import Any

from langchain_anthropic import ChatAnthropic

from src.config import settings
from src.schemas.health_report import HealthReport

_SYSTEM = (
    "Você é um analista de saúde financeira pessoal. Receba os indicadores do usuário "
    "e regras de educação financeira recuperadas. Produza um diagnóstico em português, "
    "objetivo, com pontos positivos, pontos de atenção e recomendações acionáveis."
)


def _invoke_llm(signals: dict[str, Any], rules: list[str]) -> HealthReport:
    llm = ChatAnthropic(
        model=settings.health_model,
        api_key=settings.anthropic_api_key,
        temperature=0.2,
    ).with_structured_output(HealthReport)
    prompt = (
        f"{_SYSTEM}\n\nIndicadores:\n{signals}\n\n"
        f"Regras recuperadas:\n" + "\n".join(f"- {r}" for r in rules)
    )
    return llm.invoke(prompt)  # type: ignore[return-value]


def analyze(signals: dict[str, Any], rules: list[str]) -> HealthReport:
    return _invoke_llm(signals, rules)
```

- [ ] **Step 4: Rodar — passa**

Run: `cd apps/api && pytest tests/test_health_agent.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/health/agent.py apps/api/tests/test_health_agent.py
git commit -m "feat(api): LangChain Claude agent with structured output"
```

### Task 4.7: Report service (orquestra + cache)

**Files:**
- Create: `apps/api/src/services/health/report_service.py`
- Modify: `apps/api/src/services/supabase_service.py` (helpers de fetch se necessário)

- [ ] **Step 1: Implementar orquestração**

`apps/api/src/services/health/report_service.py`:

```python
from typing import Any

from src.schemas.health_report import HealthReport
from src.services.health.aggregate import compute_signals
from src.services.health.agent import analyze
from src.services.health.retriever import retrieve_rules


def generate_report(client: Any, workspace_id: str, mes: str) -> HealthReport:
    txs = _fetch_month_txs(client, workspace_id, mes)
    investido, dividas, parcelas = _fetch_balances(client, workspace_id)
    signals = compute_signals(txs, investido=investido, dividas=dividas, parcelas_mensais=parcelas)
    query = f"poupança {signals['taxa_poupanca']:.2f} comprometimento {signals['comprometimento']:.2f}"
    rules = retrieve_rules(client, query)
    report = analyze(signals, rules)
    client.table("health_reports").upsert(
        {"workspace_id": workspace_id, "mes": mes, "payload": report.model_dump()},
        on_conflict="workspace_id,mes",
    ).execute()
    return report


def get_cached(client: Any, workspace_id: str, mes: str) -> HealthReport | None:
    res = (
        client.table("health_reports")
        .select("payload")
        .eq("workspace_id", workspace_id)
        .eq("mes", mes)
        .maybe_single()
        .execute()
    )
    if res.data:
        return HealthReport(**res.data["payload"])
    return None


def _fetch_month_txs(client: Any, workspace_id: str, mes: str) -> list[dict[str, Any]]:
    start, end = f"{mes}-01", f"{mes}-31"
    res = (
        client.table("transactions")
        .select("tipo, valor, data")
        .eq("workspace_id", workspace_id)
        .gte("data", start)
        .lte("data", end)
        .execute()
    )
    return res.data or []


def _fetch_balances(client: Any, workspace_id: str) -> tuple[float, float, float]:
    inv = client.table("investments").select("valor").eq("workspace_id", workspace_id).execute()
    investido = sum(float(r["valor"]) for r in (inv.data or []))
    deb = client.table("debts").select("saldo, parcela_valor").eq("workspace_id", workspace_id).execute()
    dividas = sum(float(r.get("saldo") or 0) for r in (deb.data or []))
    parcelas = sum(float(r.get("parcela_valor") or 0) for r in (deb.data or []))
    return investido, dividas, parcelas
```

(Conferir nomes reais de colunas de `debts` na migration `20260420000002_domain.sql` e ajustar `saldo`/`parcela_valor`.)

- [ ] **Step 2: Typecheck (mypy) + commit**

Run: `cd apps/api && mypy src/services/health/report_service.py` → sem erros bloqueantes.

```bash
git add apps/api/src/services/health/report_service.py
git commit -m "feat(api): health report orchestration + cache"
```

### Task 4.8: Router + registro

**Files:**
- Create: `apps/api/src/routers/health_report.py`
- Modify: `apps/api/src/main.py`
- Test: `apps/api/tests/test_health_report_endpoint.py`

- [ ] **Step 1: Teste falhando (membership + 200)**

`apps/api/tests/test_health_report_endpoint.py`:

```python
from unittest.mock import patch

from fastapi.testclient import TestClient

from src.main import app
from src.deps import CurrentUser, current_user
from src.schemas.health_report import HealthReport

client = TestClient(app)


def _fake_user():
    return CurrentUser(id="00000000-0000-0000-0000-000000000001")


def test_post_requires_membership():
    app.dependency_overrides[current_user] = _fake_user
    fake = HealthReport(score=70, nivel="atencao", positivos=[], atencao=[], recomendacoes=[])
    with patch("src.routers.health_report.is_member", return_value=False):
        r = client.post("/health/ws-1/analysis", json={"workspace_id": "ws-1", "mes": "2026-06"})
    assert r.status_code == 403
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Rodar — falha**

Run: `cd apps/api && pytest tests/test_health_report_endpoint.py -v`
Expected: FAIL (rota inexistente).

- [ ] **Step 3: Implementar router**

`apps/api/src/routers/health_report.py`:

```python
from fastapi import APIRouter, Depends, HTTPException

from src.deps import CurrentUser, current_user
from src.schemas.health_report import HealthAnalysisRequest, HealthReport
from src.services.health.report_service import generate_report, get_cached
from src.services.supabase_service import get_service_client, is_member

router = APIRouter(prefix="/health", tags=["health-analysis"])


@router.post("/{workspace_id}/analysis", response_model=HealthReport)
def create_analysis(workspace_id: str, req: HealthAnalysisRequest, user: CurrentUser = Depends(current_user)) -> HealthReport:
    client = get_service_client()
    if not is_member(client, workspace_id, user.id):
        raise HTTPException(status_code=403, detail="not_a_member")
    return generate_report(client, workspace_id, req.mes)


@router.get("/{workspace_id}/analysis", response_model=HealthReport | None)
def read_analysis(workspace_id: str, mes: str, user: CurrentUser = Depends(current_user)) -> HealthReport | None:
    client = get_service_client()
    if not is_member(client, workspace_id, user.id):
        raise HTTPException(status_code=403, detail="not_a_member")
    return get_cached(client, workspace_id, mes)
```

(O prefixo `/health` já é usado pelo healthcheck? O router de health atual tem prefixo `/health`? Conferir `routers/health.py`; se colidir, usar prefixo `/health-analysis`.)

- [ ] **Step 4: Registrar no main.py**

Em `apps/api/src/main.py`: `from src.routers import health, recurring, reports, health_report` e `app.include_router(health_report.router)`.

- [ ] **Step 5: Rodar — passa**

Run: `cd apps/api && pytest tests/test_health_report_endpoint.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routers/health_report.py apps/api/src/main.py apps/api/tests/test_health_report_endpoint.py
git commit -m "feat(api): health analysis endpoints"
```

### Task 4.9: Seed da base de conhecimento (regras)

**Files:**
- Create: `apps/api/scripts/seed_health_kb.py`

- [ ] **Step 1: Script de seed** — insere ~10 regras (reserva 3–6 meses, 50/30/20, comprometimento de dívida < 30% da renda, utilização de cartão < 30%, etc.), gera embedding com `embed()` e insere em `health_kb` via service client.
- [ ] **Step 2: Rodar**

Run: `cd apps/api && python -m scripts.seed_health_kb`
Expected: imprime "N regras inseridas".

- [ ] **Step 3: Commit**

```bash
git add apps/api/scripts/seed_health_kb.py
git commit -m "feat(api): seed financial-rules knowledge base"
```

---

## FASE 5 — Card de saúde no dashboard

### Task 5.1: Hook `useHealthReport`

**Files:**
- Create: `apps/web/src/hooks/useHealthReport.ts`

- [ ] **Step 1: Implementar** — `useQuery` GET cacheado + `useMutation` POST "Analisar agora", chamando a API (base URL via env, mesmo padrão do `ExportPdfButton`). Tipo de retorno espelha `HealthReport`.

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface HealthReport {
  score: number;
  nivel: 'saudavel' | 'atencao' | 'critico';
  positivos: string[];
  atencao: string[];
  recomendacoes: string[];
}

const API = import.meta.env.VITE_API_URL ?? '';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' };
}

export function useHealthReport(workspaceId: string | undefined, mes: string) {
  return useQuery({
    queryKey: ['health', workspaceId, mes],
    enabled: !!workspaceId,
    queryFn: async (): Promise<HealthReport | null> => {
      const r = await fetch(`${API}/health/${workspaceId}/analysis?mes=${mes}`, { headers: await authHeaders() });
      if (!r.ok) throw new Error('health_fetch_failed');
      return r.json();
    }
  });
}

export function useAnalyzeHealth(workspaceId: string | undefined, mes: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<HealthReport> => {
      const r = await fetch(`${API}/health/${workspaceId}/analysis`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ workspace_id: workspaceId, mes })
      });
      if (!r.ok) throw new Error('health_analyze_failed');
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health', workspaceId, mes] })
  });
}
```

(Confirmar a env real usada pela API no front — ver `ExportPdfButton.tsx` — e reusar a mesma.)

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter web typecheck` → PASS

```bash
git add apps/web/src/hooks/useHealthReport.ts
git commit -m "feat(web): useHealthReport hook"
```

### Task 5.2: HealthCard + integração na Home

**Files:**
- Create: `apps/web/src/components/dashboard/HealthCard.tsx`
- Modify: `apps/web/src/pages/Home.tsx`
- Test: `apps/web/src/components/dashboard/HealthCard.test.tsx`

- [ ] **Step 1: Teste falhando (render do score + listas)**

`apps/web/src/components/dashboard/HealthCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthCard } from './HealthCard';

describe('HealthCard', () => {
  it('mostra score e pontos de atenção', () => {
    render(
      <HealthCard
        report={{ score: 65, nivel: 'atencao', positivos: ['Poupa 20%'], atencao: ['Cartão alto'], recomendacoes: ['Pagar fatura'] }}
        loading={false}
        onAnalyze={() => {}}
      />
    );
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('Cartão alto')).toBeInTheDocument();
  });

  it('mostra estado vazio com botão Analisar quando report é null', () => {
    render(<HealthCard report={null} loading={false} onAnalyze={() => {}} />);
    expect(screen.getByRole('button', { name: /analisar/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm --filter web test -- HealthCard`
Expected: FAIL.

- [ ] **Step 3: Implementar HealthCard**

`apps/web/src/components/dashboard/HealthCard.tsx`:

```tsx
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HealthReport } from '@/hooks/useHealthReport';

const toneByNivel = { saudavel: 'positive', atencao: 'warn', critico: 'negative' } as const;

export function HealthCard({
  report,
  loading,
  onAnalyze
}: {
  report: HealthReport | null;
  loading: boolean;
  onAnalyze: () => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Saúde Financeira</CardTitle>
        <Button size="sm" variant="outline" onClick={onAnalyze} disabled={loading}>
          {loading ? 'Analisando…' : report ? 'Reanalisar' : 'Analisar agora'}
        </Button>
      </div>
      {!report ? (
        <p className="text-sm text-muted">Sem análise ainda. Clique em “Analisar agora”.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-text">{report.score}</span>
            <Badge tone={toneByNivel[report.nivel]}>{report.nivel}</Badge>
          </div>
          <Section title="Pontos positivos" items={report.positivos} tone="text-positive" />
          <Section title="Pontos de atenção" items={report.atencao} tone="text-warn" />
          <Section title="Recomendações" items={report.recomendacoes} tone="text-muted" />
        </div>
      )}
    </Card>
  );
}

function Section({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={i} className={tone}>• {it}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Rodar — passa**

Run: `pnpm --filter web test -- HealthCard`
Expected: PASS.

- [ ] **Step 5: Integrar na Home** — em `Home.tsx`, usar `useHealthReport` + `useAnalyzeHealth`, renderizar `<HealthCard report={query.data ?? null} loading={mut.isPending} onAnalyze={() => mut.mutate()} />`. Tratar erro do fetch sem quebrar a home (try/catch → `report=null`).

- [ ] **Step 6: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web build && pnpm --filter web test` → PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/dashboard/HealthCard.tsx apps/web/src/pages/Home.tsx apps/web/src/components/dashboard/HealthCard.test.tsx
git commit -m "feat(web): financial health card on dashboard"
```

---

## Verificação final

- [ ] `pnpm --filter web typecheck` → PASS
- [ ] `pnpm --filter web lint` → PASS
- [ ] `pnpm --filter web test` → todos verdes
- [ ] `pnpm --filter web build` → PASS
- [ ] `cd apps/api && pytest` → testes do agente verdes (LLM mockado); RLS de `health_reports` validado
- [ ] `cd apps/api && ruff check src && mypy src` → sem erros bloqueantes
- [ ] Dogfood manual: login → dashboard dark com net worth/contas/cartões/métricas → "Analisar agora" gera diagnóstico → editar e excluir um item de cada tela.

## Self-review (preenchido)

- **Cobertura da spec:** §1 rebrand → Task 0.2; §2 tokens → 0.1+1.2; §3 shell/telas → 0.2+3.4; §4 edição → 2.1–2.5; §5 dashboard → 3.1–3.3+5.x; §6 agente → 4.1–4.9; §7 modelo de dados → 4.1; §8 erros/testes → testes em cada fase + 5.2 step 5.
- **Pontos a confirmar na execução (não são placeholders, são verificações de nomes reais no schema):** nome da tabela de membership (`memberships` vs `workspace_members`), colunas de `debts` (`saldo`/`parcela_valor`), env da API usada no front (`VITE_API_URL`), possível colisão de prefixo `/health`.
- **Consistência de tipos:** `HealthReport` (campos score/nivel/positivos/atencao/recomendacoes) idêntico em Pydantic (4.3) e TS (5.1); `RowActions` props (`onEdit/onDelete/confirmText`) consistentes; forms usam `mode`/`initialValues` uniformemente.
