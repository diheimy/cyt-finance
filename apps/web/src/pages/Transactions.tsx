import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';
import { useCategories } from '@/hooks/useCategories';
import { useCards } from '@/hooks/useCards';
import { useDeleteTransaction, useTransactions } from '@/hooks/useTransactions';
import { Modal } from '@/components/Modal';
import TransactionForm from '@/components/forms/TransactionForm';
import InstallmentForm from '@/components/forms/InstallmentForm';
import { currentMonthKey, formatDateBR, formatMoney } from '@/utils/format';
import type { TransactionFilters, TransactionKind } from '@/types/schemas';

type FormKind = 'tx' | 'installment' | null;

export default function Transactions() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);

  const [month, setMonth] = useState(currentMonthKey());
  const [tipo, setTipo] = useState<TransactionKind | ''>('');
  const [categoriaId, setCategoriaId] = useState('');
  const [cartaoId, setCartaoId] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState<FormKind>(null);

  const cats = useCategories(active?.id);
  const cards = useCards(active?.id);
  const filters = useMemo<TransactionFilters | null>(() => {
    if (!active) return null;
    return {
      workspace_id: active.id,
      month,
      tipo: tipo || undefined,
      categoria_id: categoriaId || undefined,
      cartao_id: cartaoId || undefined,
      search: search || undefined
    };
  }, [active, month, tipo, categoriaId, cartaoId, search]);

  const list = useTransactions(filters);
  const del = useDeleteTransaction(active?.id);

  const totais = useMemo(() => {
    const rows = list.data ?? [];
    const entradas = rows
      .filter((r) => r.tipo === 'entrada')
      .reduce((acc, r) => acc + Number(r.valor), 0);
    const saidas = rows
      .filter((r) => r.tipo === 'gasto')
      .reduce((acc, r) => acc + Number(r.valor), 0);
    return { entradas, saidas, resultado: entradas - saidas };
  }, [list.data]);

  if (!active) return <p className="p-6">Carregando workspace…</p>;
  const canEdit = active.role !== 'viewer';

  return (
    <section className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Transações</h1>
          <p className="text-slate-500 text-sm">{active.nome}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setFormOpen('tx')}
              className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold"
            >
              + Nova
            </button>
            <button
              onClick={() => setFormOpen('installment')}
              className="border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              + Parcelado
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Entradas" value={formatMoney(totais.entradas)} accent="green" />
        <StatCard label="Saídas" value={formatMoney(totais.saidas)} accent="red" />
        <StatCard
          label="Resultado"
          value={formatMoney(totais.resultado)}
          accent={totais.resultado >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TransactionKind | '')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos os tipos</option>
          <option value="gasto">Gastos</option>
          <option value="entrada">Entradas</option>
        </select>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as categorias</option>
          {(cats.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select
          value={cartaoId}
          onChange={(e) => setCartaoId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos os cartões</option>
          {(cards.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} •••• {c.ultimos_digitos}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Buscar descrição…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm col-span-2 md:col-span-1"
        />
      </div>

      {list.isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}
      {list.isError && (
        <p className="text-red-600 text-sm">Erro ao carregar: {(list.error as Error).message}</p>
      )}

      <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
        {(list.data ?? []).length === 0 && !list.isLoading && (
          <li className="p-6 text-center text-slate-500 text-sm">
            Nenhuma transação neste período.
          </li>
        )}
        {(list.data ?? []).map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{t.descricao}</p>
              <p className="text-xs text-slate-500">
                {formatDateBR(t.data)}
                {t.categoria ? ` · ${t.categoria.nome}` : ''}
                {t.cartao ? ` · ${t.cartao.nome} •••• ${t.cartao.ultimos_digitos}` : ''}
                {t.parcelas_total > 1
                  ? ` · parcela ${t.parcela_atual}/${t.parcelas_total}`
                  : ''}
                {!t.paga && t.parcelas_total > 1 ? ' · pendente' : ''}
              </p>
            </div>
            <span
              className={`font-semibold ${
                t.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {t.tipo === 'entrada' ? '+' : '-'} {formatMoney(Number(t.valor))}
            </span>
            {canEdit && (
              <button
                onClick={() => {
                  const msg = t.compra_id
                    ? 'Excluir APENAS esta parcela? As outras parcelas permanecem.'
                    : 'Excluir esta transação?';
                  if (confirm(msg)) del.mutate(t.id);
                }}
                className="text-slate-400 hover:text-red-600 px-2"
                aria-label="Excluir"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <Modal
        open={formOpen === 'tx'}
        onClose={() => setFormOpen(null)}
        title="Nova transação"
      >
        <TransactionForm
          workspaceId={active.id}
          onSuccess={() => setFormOpen(null)}
          onCancel={() => setFormOpen(null)}
        />
      </Modal>

      <Modal
        open={formOpen === 'installment'}
        onClose={() => setFormOpen(null)}
        title="Gasto parcelado no cartão"
      >
        <InstallmentForm
          workspaceId={active.id}
          onSuccess={() => setFormOpen(null)}
          onCancel={() => setFormOpen(null)}
        />
      </Modal>
    </section>
  );
}

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent: 'green' | 'red' | 'blue';
}) {
  const accentMap = {
    green: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600'
  } as const;
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`font-semibold text-lg ${accentMap[accent]}`}>{value}</p>
    </div>
  );
}
