import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DebtInputSchema, useCreateDebt, type DebtKind } from '@/hooks/useDebts';
import { parseMoneyInput, todayISO } from '@/utils/format';

interface Props {
  workspaceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DebtForm({ workspaceId, onSuccess, onCancel }: Props) {
  const { user } = useAuth();
  const create = useCreateDebt(workspaceId);

  const [tipo, setTipo] = useState<DebtKind>('pagar');
  const [pessoa, setPessoa] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    try {
      const valor = parseMoneyInput(valorTotal);
      const input = DebtInputSchema.parse({
        workspace_id: workspaceId,
        tipo,
        pessoa: pessoa.trim(),
        valor_total: valor,
        parcelas_total: Number(parcelas),
        descricao: descricao.trim() || null,
        data_inicio: dataInicio
      });
      await create.mutateAsync({ ...input, created_by: user.id });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro_criar');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipo('pagar')}
          className={`rounded-lg py-2 font-semibold text-sm ${
            tipo === 'pagar' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          A pagar
        </button>
        <button
          type="button"
          onClick={() => setTipo('receber')}
          className={`rounded-lg py-2 font-semibold text-sm ${
            tipo === 'receber' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          A receber
        </button>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Pessoa / credor</span>
        <input
          type="text"
          required
          maxLength={100}
          placeholder="Ex: João, Banco X, Mãe"
          value={pessoa}
          onChange={(e) => setPessoa(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Valor total (R$)</span>
        <input
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={valorTotal}
          onChange={(e) => setValorTotal(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Parcelas</span>
        <input
          type="number"
          required
          min={1}
          max={600}
          value={parcelas}
          onChange={(e) => setParcelas(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Descrição (opcional)</span>
        <input
          type="text"
          maxLength={200}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Data de início</span>
        <input
          type="date"
          required
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 py-2 font-semibold text-slate-700"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={create.isPending}
          className="flex-1 bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {create.isPending ? 'Salvando…' : 'Criar dívida'}
        </button>
      </div>
    </form>
  );
}
