import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';
import { useDeleteInvestment, useInvestments } from '@/hooks/useInvestments';
import { Modal } from '@/components/Modal';
import InvestmentForm from '@/components/forms/InvestmentForm';
import { formatDateBR, formatMoney } from '@/utils/format';

export default function Investments() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);
  const list = useInvestments(active?.id);
  const del = useDeleteInvestment(active?.id);
  const [formOpen, setFormOpen] = useState(false);

  const { total, porCategoria } = useMemo(() => {
    const rows = list.data ?? [];
    const totalN = rows.reduce((acc, r) => acc + Number(r.valor), 0);
    const porCat = new Map<string, number>();
    rows.forEach((r) => porCat.set(r.categoria, (porCat.get(r.categoria) ?? 0) + Number(r.valor)));
    const ordered = Array.from(porCat.entries()).sort((a, b) => b[1] - a[1]);
    return { total: totalN, porCategoria: ordered };
  }, [list.data]);

  if (!active) return <p className="p-6">Carregando…</p>;
  const canEdit = active.role !== 'viewer';

  return (
    <section className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Investimentos</h1>
          <p className="text-slate-500 text-sm">
            Registre seus aportes para acompanhar o patrimônio.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setFormOpen(true)}
            className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            + Novo aporte
          </button>
        )}
      </header>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Total aportado</p>
        <p className="font-semibold text-3xl mt-1 text-blue-600">{formatMoney(total)}</p>
        {porCategoria.length > 0 && (
          <ul className="mt-4 space-y-1">
            {porCategoria.map(([cat, soma]) => (
              <li key={cat} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{cat}</span>
                <span className="font-medium">{formatMoney(soma)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {list.isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {(list.data ?? []).length === 0 && !list.isLoading && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500 text-sm">
          Nenhum investimento registrado.
        </div>
      )}

      <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
        {(list.data ?? []).map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-2 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{inv.descricao}</p>
              <p className="text-xs text-slate-500">
                {formatDateBR(inv.data)} · {inv.categoria}
              </p>
            </div>
            <span className="font-semibold text-blue-600">{formatMoney(Number(inv.valor))}</span>
            {canEdit && (
              <button
                onClick={() => {
                  if (confirm('Excluir este aporte?')) del.mutate(inv.id);
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Novo aporte">
        <InvestmentForm
          workspaceId={active.id}
          onSuccess={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </section>
  );
}
