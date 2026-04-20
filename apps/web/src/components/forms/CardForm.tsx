import { useState } from 'react';
import { CardInputSchema, useCreateCard, useUpdateCard, type Card } from '@/hooks/useCards';

interface Props {
  workspaceId: string;
  existing?: Card;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CardForm({ workspaceId, existing, onSuccess, onCancel }: Props) {
  const [nome, setNome] = useState(existing?.nome ?? '');
  const [digitos, setDigitos] = useState(existing?.ultimos_digitos ?? '');
  const [diaFechamento, setDiaFechamento] = useState(existing?.dia_fechamento ?? 5);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateCard();
  const update = useUpdateCard(workspaceId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const parsed = CardInputSchema.parse({
        workspace_id: workspaceId,
        nome: nome.trim(),
        ultimos_digitos: digitos,
        dia_fechamento: diaFechamento
      });
      if (existing) {
        await update.mutateAsync({
          id: existing.id,
          patch: {
            nome: parsed.nome,
            ultimos_digitos: parsed.ultimos_digitos,
            dia_fechamento: parsed.dia_fechamento
          }
        });
      } else {
        await create.mutateAsync(parsed);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro_salvar');
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Nome do cartão</span>
        <input
          type="text"
          required
          placeholder="Ex: Nubank Roxinho"
          maxLength={80}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Últimos 4 dígitos</span>
        <input
          type="text"
          required
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          placeholder="1234"
          value={digitos}
          onChange={(e) => setDigitos(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-widest"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Dia de fechamento</span>
        <input
          type="number"
          required
          min={1}
          max={31}
          value={diaFechamento}
          onChange={(e) => setDiaFechamento(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <span className="text-xs text-slate-500 mt-1 block">
          Gastos após esta data caem na fatura do mês seguinte.
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
          disabled={pending}
          className="flex-1 bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {pending ? 'Salvando…' : existing ? 'Atualizar' : 'Criar cartão'}
        </button>
      </div>
    </form>
  );
}
