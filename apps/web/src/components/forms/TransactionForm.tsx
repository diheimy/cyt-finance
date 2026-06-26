import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { parseMoneyInput, todayISO } from '@/utils/format';
import { TransactionInputSchema, type TransactionKind } from '@/types/schemas';

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
  workspaceId,
  onSuccess,
  onCancel,
  defaultKind = 'gasto',
  mode = 'create',
  initialValues
}: Props) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<TransactionKind>(initialValues?.tipo ?? defaultKind);
  const [valor, setValor] = useState(
    initialValues ? String(initialValues.valor).replace('.', ',') : ''
  );
  const [descricao, setDescricao] = useState(initialValues?.descricao ?? '');
  const [data, setData] = useState(initialValues?.data ?? todayISO());
  const [categoriaId, setCategoriaId] = useState<string>(initialValues?.categoria_id ?? '');
  const [error, setError] = useState<string | null>(null);

  const cats = useCategories(workspaceId, tipo);
  const createTx = useCreateTransaction(workspaceId);
  const updateTx = useUpdateTransaction(workspaceId);
  const pending = createTx.isPending || updateTx.isPending;

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
      if (mode === 'edit' && initialValues) {
        const patch = {
          tipo: input.tipo,
          valor: input.valor,
          descricao: input.descricao,
          data: input.data,
          categoria_id: input.categoria_id,
          cartao_id: input.cartao_id,
          paga: input.paga
        };
        await updateTx.mutateAsync({ id: initialValues.id, patch });
      } else {
        await createTx.mutateAsync({ ...input, created_by: user.id });
      }
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
              : 'bg-surface-2 text-muted'
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
              : 'bg-surface-2 text-muted'
          }`}
        >
          Entrada
        </button>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-text">Valor (R$)</span>
        <input
          type="text"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-text">Descrição</span>
        <input
          type="text"
          required
          maxLength={200}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-text">Data</span>
        <input
          type="date"
          required
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-text">Categoria</span>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 bg-surface"
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
            className="flex-1 rounded-lg border border-border py-2 font-semibold text-text"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-accent text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
