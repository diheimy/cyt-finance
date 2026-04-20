import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { parseMoneyInput, todayISO } from '@/utils/format';
import { TransactionInputSchema, type TransactionKind } from '@/types/schemas';

interface Props {
  workspaceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultKind?: TransactionKind;
}

export default function TransactionForm({
  workspaceId,
  onSuccess,
  onCancel,
  defaultKind = 'gasto'
}: Props) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<TransactionKind>(defaultKind);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(todayISO());
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const cats = useCategories(workspaceId, tipo);
  const createTx = useCreateTransaction(workspaceId);

  const categorias = useMemo(() => cats.data ?? [], [cats.data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError('usuário não autenticado');
      return;
    }
    try {
      const valorNum = parseMoneyInput(valor);
      const input = TransactionInputSchema.parse({
        workspace_id: workspaceId,
        tipo,
        valor: valorNum,
        descricao: descricao.trim(),
        data,
        categoria_id: categoriaId || null,
        cartao_id: null,
        paga: true
      });
      await createTx.mutateAsync({ ...input, created_by: user.id });
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
            tipo === 'gasto'
              ? 'bg-red-500 text-white'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setTipo('entrada')}
          className={`rounded-lg py-2 font-semibold text-sm ${
            tipo === 'entrada'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          Entrada
        </button>
      </div>

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
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
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

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Categoria</span>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
        >
          <option value="">— sem categoria —</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
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
          disabled={createTx.isPending}
          className="flex-1 bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {createTx.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
