import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { RecurringInputSchema, useCreateRecurring } from '@/hooks/useRecurring';
import { parseMoneyInput, todayISO } from '@/utils/format';
import type { TransactionKind } from '@/types/schemas';

interface Props {
  workspaceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function RecurringForm({ workspaceId, onSuccess, onCancel }: Props) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<TransactionKind>('gasto');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState(todayISO());
  const [categoriaId, setCategoriaId] = useState('');
  const [limite, setLimite] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const cats = useCategories(workspaceId, tipo);
  const create = useCreateRecurring(workspaceId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    try {
      const valorNum = parseMoneyInput(valor);
      const limiteNum = Number(limite) || 0;
      const input = RecurringInputSchema.parse({
        workspace_id: workspaceId,
        tipo,
        valor: valorNum,
        descricao: descricao.trim(),
        categoria_id: categoriaId || null,
        data_inicio: dataInicio,
        limite_parcelas: limiteNum
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
          onClick={() => setTipo('gasto')}
          className={`rounded-lg py-2 font-semibold text-sm ${
            tipo === 'gasto' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Gasto fixo
        </button>
        <button
          type="button"
          onClick={() => setTipo('entrada')}
          className={`rounded-lg py-2 font-semibold text-sm ${
            tipo === 'entrada' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Entrada fixa
        </button>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Valor mensal (R$)</span>
        <input
          type="text"
          inputMode="decimal"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Descrição</span>
        <input
          type="text"
          required
          maxLength={200}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Aluguel, Internet, Salário"
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

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Categoria</span>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
        >
          <option value="">— sem categoria —</option>
          {(cats.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Limite de parcelas (0 = infinito)</span>
        <input
          type="number"
          min={0}
          max={600}
          required
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <span className="text-xs text-slate-500 mt-1 block">
          Ex: 12 para financiamento de 12 meses. Use 0 para cobranças sem fim (aluguel).
        </span>
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
          {create.isPending ? 'Salvando…' : 'Criar regra'}
        </button>
      </div>
    </form>
  );
}
