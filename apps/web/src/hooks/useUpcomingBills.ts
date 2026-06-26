import { useRecurring } from '@/hooks/useRecurring';
import { useDebts } from '@/hooks/useDebts';

export interface UpcomingBill {
  id: string;
  label: string;
  valor: number;
  origem: 'recorrente' | 'dívida';
}

export function useUpcomingBills(workspaceId: string | undefined) {
  const rec = useRecurring(workspaceId);
  const debts = useDebts(workspaceId);

  const items: UpcomingBill[] = [];

  (rec.data ?? [])
    .filter((r) => r.ativo && r.tipo === 'gasto')
    .forEach((r) =>
      items.push({ id: `r-${r.id}`, label: r.descricao, valor: Number(r.valor), origem: 'recorrente' })
    );

  (debts.data ?? [])
    .filter((d) => !d.quitada_em && d.tipo === 'pagar' && d.parcelas_pagas < d.parcelas_total)
    .forEach((d) =>
      items.push({
        id: `d-${d.id}`,
        label: d.descricao ? `${d.pessoa} · ${d.descricao}` : d.pessoa,
        valor: Number(d.valor_total) / d.parcelas_total,
        origem: 'dívida'
      })
    );

  items.sort((a, b) => b.valor - a.valor);
  const total = items.reduce((s, i) => s + i.valor, 0);

  return { items, total, isLoading: rec.isLoading || debts.isLoading };
}
