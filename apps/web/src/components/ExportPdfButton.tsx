import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { downloadPdfReport } from '@/lib/api';
import { currentMonthKey, monthBounds } from '@/utils/format';

interface Props {
  workspaceId: string;
  defaultMonth?: string;
  variant?: 'primary' | 'secondary';
}

export default function ExportPdfButton({
  workspaceId,
  defaultMonth,
  variant = 'secondary'
}: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(defaultMonth ?? currentMonthKey());
  const [incluirAuditoria, setIncluirAuditoria] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const { start, end } = monthBounds(month);
      await downloadPdfReport({
        workspace_id: workspaceId,
        periodo_inicio: start,
        periodo_fim: end,
        incluir_auditoria: incluirAuditoria
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro_pdf');
    } finally {
      setLoading(false);
    }
  }

  const btnClass =
    variant === 'primary'
      ? 'bg-slate-900 text-white'
      : 'border border-slate-300 text-slate-700';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${btnClass} rounded-lg px-4 py-2 text-sm font-semibold`}
      >
        📄 Exportar PDF
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Exportar relatório PDF">
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Período (mês)</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={incluirAuditoria}
              onChange={(e) => setIncluirAuditoria(e.target.checked)}
            />
            Incluir trilha de auditoria
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-slate-300 py-2 font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
            >
              {loading ? 'Gerando PDF…' : 'Baixar PDF'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
