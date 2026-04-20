import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { InvestmentInputSchema, useCreateInvestment } from '@/hooks/useInvestments';
import { parseMoneyInput, todayISO } from '@/utils/format';

interface Props {
  workspaceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InvestmentForm({ workspaceId, onSuccess, onCancel }: Props) {
  const { user } = useAuth();
  const cats = useCategories(workspaceId, 'investimento');
  const create = useCreateInvestment(workspaceId);

  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    try {
      const valorNum = parseMoneyInput(valor);
      const input = InvestmentInputSchema.parse({
        workspace_id: workspaceId,
        valor: valorNum,
        descricao: descricao.trim(),
        categoria: (categoria || 'Outros').trim(),
        data
      });
      await create.mutateAsync({ ...input, created_by: user.id });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro_criar');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Valor (R$)</span>
        <input
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Descrição</span>
        <input
          type="text"
          required
          maxLength={200}
          placeholder="Ex: Aporte Tesouro Selic"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Categoria</span>
        <input
          type="text"
          list="invest-cats"
          required
          maxLength={50}
          placeholder="Renda Fixa"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <datalist id="invest-cats">
          {(cats.data ?? []).map((c) => (
            <option key={c.id} value={c.nome} />
          ))}
        </datalist>
        <span className="text-xs text-slate-500 mt-1 block">
          Pode escolher uma categoria existente ou digitar uma nova.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Data</span>
        <input
          type="date"
          required
          value={data}
          onChange={(e) => setData(e.target.value)}
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
          {create.isPending ? 'Salvando…' : 'Salvar aporte'}
        </button>
      </div>
    </form>
  );
}
