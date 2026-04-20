import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';
import {
  useDeleteRecurring,
  useRecurring,
  useUpdateRecurring,
  type RecurringRow
} from '@/hooks/useRecurring';
import { Modal } from '@/components/Modal';
import RecurringForm from '@/components/forms/RecurringForm';
import { formatDateBR, formatMoney } from '@/utils/format';

export default function Recurring() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);
  const list = useRecurring(active?.id);
  const update = useUpdateRecurring(active?.id);
  const del = useDeleteRecurring(active?.id);
  const [formOpen, setFormOpen] = useState(false);

  if (!active) return <p className="p-6">Carregando…</p>;
  const canEdit = active.role !== 'viewer';

  function toggleAtivo(r: RecurringRow) {
    update.mutate({ id: r.id, patch: { ativo: !r.ativo } });
  }

  function remove(r: RecurringRow) {
    if (
      confirm(
        `Excluir regra "${r.descricao}"? O histórico de transações já materializadas permanece.`
      )
    ) {
      del.mutate(r.id);
    }
  }

  return (
    <section className="p-6 space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl">Recorrentes</h1>
          <p className="text-slate-500 text-sm">
            Contas fixas e receitas mensais que se repetem automaticamente.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setFormOpen(true)}
            className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            + Nova regra
          </button>
        )}
      </header>

      {list.isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {(list.data ?? []).length === 0 && !list.isLoading && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500 text-sm">
          Nenhuma regra recorrente cadastrada ainda.
        </div>
      )}

      <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
        {(list.data ?? []).map((r) => {
          const restantes =
            r.limite_parcelas > 0
              ? Math.max(0, r.limite_parcelas - r.parcelas_materializadas)
              : null;
          return (
            <li key={r.id} className="flex items-center justify-between gap-2 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{r.descricao}</p>
                  {!r.ativo && (
                    <span className="text-xs bg-slate-200 text-slate-600 rounded px-2 py-0.5">
                      pausada
                    </span>
                  )}
                  {r.limite_parcelas === 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                      contínua
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  início {formatDateBR(r.data_inicio)}
                  {r.categoria ? ` · ${r.categoria.nome}` : ''}
                  {r.limite_parcelas > 0
                    ? ` · ${r.parcelas_materializadas}/${r.limite_parcelas} materializadas${
                        restantes !== null ? ` · ${restantes} restantes` : ''
                      }`
                    : ` · ${r.parcelas_materializadas} materializadas`}
                </p>
              </div>
              <span
                className={`font-semibold ${
                  r.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {r.tipo === 'entrada' ? '+' : '-'} {formatMoney(Number(r.valor))}
              </span>
              {canEdit && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleAtivo(r)}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    {r.ativo ? 'Pausar' : 'Retomar'}
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Excluir"
                  >
                    ✕
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nova regra recorrente">
        <RecurringForm
          workspaceId={active.id}
          onSuccess={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </section>
  );
}
