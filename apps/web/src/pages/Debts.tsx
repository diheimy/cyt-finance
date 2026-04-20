import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';
import {
  useDebts,
  useDeleteDebt,
  usePayInstallment,
  useUndoInstallment,
  type DebtRow
} from '@/hooks/useDebts';
import { Modal } from '@/components/Modal';
import DebtForm from '@/components/forms/DebtForm';
import { formatDateBR, formatMoney } from '@/utils/format';

export default function Debts() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);
  const list = useDebts(active?.id);
  const pay = usePayInstallment(active?.id);
  const undo = useUndoInstallment(active?.id);
  const del = useDeleteDebt(active?.id);
  const [formOpen, setFormOpen] = useState(false);

  const totais = useMemo(() => {
    const rows = list.data ?? [];
    const abertas = rows.filter((r) => !r.quitada_em);
    const aPagar = abertas
      .filter((r) => r.tipo === 'pagar')
      .reduce((acc, r) => acc + valorPendente(r), 0);
    const aReceber = abertas
      .filter((r) => r.tipo === 'receber')
      .reduce((acc, r) => acc + valorPendente(r), 0);
    return { aPagar, aReceber, saldo: aReceber - aPagar };
  }, [list.data]);

  if (!active) return <p className="p-6">Carregando…</p>;
  const canEdit = active.role !== 'viewer';

  return (
    <section className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Dívidas</h1>
          <p className="text-slate-500 text-sm">Controle dívidas a pagar e a receber, parceladas.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setFormOpen(true)}
            className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            + Nova dívida
          </button>
        )}
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="A receber" value={formatMoney(totais.aReceber)} color="text-emerald-600" />
        <Stat label="A pagar" value={formatMoney(totais.aPagar)} color="text-red-600" />
        <Stat
          label="Saldo"
          value={formatMoney(totais.saldo)}
          color={totais.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
      </div>

      {list.isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {(list.data ?? []).length === 0 && !list.isLoading && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500 text-sm">
          Nenhuma dívida registrada.
        </div>
      )}

      <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
        {(list.data ?? []).map((d) => {
          const valorParc = Number(d.valor_total) / d.parcelas_total;
          const pago = Number(d.valor_total) * (d.parcelas_pagas / d.parcelas_total);
          const restante = Number(d.valor_total) - pago;
          const progresso = Math.round((d.parcelas_pagas / d.parcelas_total) * 100);
          return (
            <li key={d.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        d.tipo === 'receber'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {d.tipo === 'receber' ? 'A receber' : 'A pagar'}
                    </span>
                    <p className="font-medium truncate">{d.pessoa}</p>
                    {d.quitada_em && (
                      <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
                        ✓ quitada
                      </span>
                    )}
                  </div>
                  {d.descricao && (
                    <p className="text-xs text-slate-500 truncate">{d.descricao}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    início {formatDateBR(d.data_inicio)} · {d.parcelas_pagas}/{d.parcelas_total}{' '}
                    pagas · parcela {formatMoney(valorParc)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(Number(d.valor_total))}</p>
                  {!d.quitada_em && (
                    <p className="text-xs text-slate-500">
                      {formatMoney(restante)} restante
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    d.tipo === 'receber' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>

              {canEdit && (
                <div className="flex gap-3 mt-3 text-sm">
                  {!d.quitada_em && d.parcelas_pagas < d.parcelas_total && (
                    <button
                      onClick={() => pay.mutate(d)}
                      className="text-slate-900 font-semibold hover:underline"
                    >
                      Registrar parcela paga
                    </button>
                  )}
                  {d.parcelas_pagas > 0 && (
                    <button
                      onClick={() => undo.mutate(d)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      Desfazer última
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Excluir dívida com "${d.pessoa}"?`)) del.mutate(d.id);
                    }}
                    className="text-red-600 hover:text-red-800 ml-auto"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nova dívida">
        <DebtForm
          workspaceId={active.id}
          onSuccess={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`font-semibold text-lg ${color}`}>{value}</p>
    </div>
  );
}

function valorPendente(d: DebtRow): number {
  const total = Number(d.valor_total);
  return total - total * (d.parcelas_pagas / d.parcelas_total);
}
