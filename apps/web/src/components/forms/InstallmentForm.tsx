import { useMemo, useState } from 'react';
import { useCards } from '@/hooks/useCards';
import { useCategories } from '@/hooks/useCategories';
import { InstallmentInputSchema, useCreateInstallments } from '@/hooks/useInstallments';
import { formatMoney, parseMoneyInput, todayISO } from '@/utils/format';

interface Props {
  workspaceId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InstallmentForm({ workspaceId, onSuccess, onCancel }: Props) {
  const cards = useCards(workspaceId);
  const cats = useCategories(workspaceId, 'gasto');
  const create = useCreateInstallments();

  const [cartaoId, setCartaoId] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [parcelas, setParcelas] = useState(2);
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [dataCompra, setDataCompra] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const valorParcela = useMemo(() => {
    const n = Number(parseMoneyInput(valorTotal || '0'));
    if (!Number.isFinite(n) || parcelas <= 0) return 0;
    return Math.round((n / parcelas) * 100) / 100;
  }, [valorTotal, parcelas]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!cartaoId) {
      setError('Selecione um cartão');
      return;
    }
    try {
      const valor = parseMoneyInput(valorTotal);
      const input = InstallmentInputSchema.parse({
        workspace_id: workspaceId,
        cartao_id: cartaoId,
        valor_total: valor,
        parcelas: Number(parcelas),
        descricao: descricao.trim(),
        categoria_id: categoriaId || null,
        data_compra: dataCompra
      });
      await create.mutateAsync(input);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro_criar');
    }
  }

  if (cards.isLoading) return <p className="text-sm text-slate-500">Carregando cartões…</p>;

  if ((cards.data ?? []).length === 0) {
    return (
      <div className="text-sm text-slate-600 space-y-2">
        <p>Você precisa cadastrar um cartão antes de lançar compras parceladas.</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-900 font-medium underline"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Cartão</span>
        <select
          required
          value={cartaoId}
          onChange={(e) => setCartaoId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
        >
          <option value="">— selecione —</option>
          {(cards.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} •••• {c.ultimos_digitos} (fecha dia {c.dia_fechamento})
            </option>
          ))}
        </select>
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
        <select
          value={parcelas}
          onChange={(e) => setParcelas(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
        >
          {Array.from({ length: 59 }, (_, i) => i + 2).map((n) => (
            <option key={n} value={n}>
              {n}x
            </option>
          ))}
        </select>
        {valorParcela > 0 && (
          <span className="text-xs text-slate-500 mt-1 block">
            {parcelas}x de {formatMoney(valorParcela)} (última ajustada para bater o total)
          </span>
        )}
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
        <span className="text-sm font-medium text-slate-700">Data da compra</span>
        <input
          type="date"
          required
          value={dataCompra}
          onChange={(e) => setDataCompra(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <span className="text-xs text-slate-500 mt-1 block">
          A 1ª parcela cai na próxima fatura após o fechamento.
        </span>
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
          {create.isPending ? 'Criando parcelas…' : `Lançar ${parcelas}x`}
        </button>
      </div>
    </form>
  );
}
