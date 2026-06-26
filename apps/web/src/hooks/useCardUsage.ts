import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { monthBounds } from '@/utils/format';
import { useCards } from '@/hooks/useCards';

export interface CardUsageRow {
  id: string;
  nome: string;
  ultimos_digitos: string;
  fatura: number;
}

interface SpendRow {
  cartao_id: string | null;
  valor: number;
}

export function useCardUsage(workspaceId: string | undefined, month: string) {
  const cards = useCards(workspaceId);

  const spend = useQuery({
    queryKey: ['card-usage', workspaceId, month],
    enabled: !!workspaceId,
    queryFn: async (): Promise<SpendRow[]> => {
      const { start, end } = monthBounds(month);
      const { data, error } = await supabase
        .from('transactions')
        .select('cartao_id, valor')
        .eq('workspace_id', workspaceId!)
        .eq('tipo', 'gasto')
        .not('cartao_id', 'is', null)
        .gte('data', start)
        .lte('data', end);
      if (error) throw error;
      return (data ?? []) as SpendRow[];
    }
  });

  const byCard = new Map<string, number>();
  (spend.data ?? []).forEach((t) => {
    if (t.cartao_id) byCard.set(t.cartao_id, (byCard.get(t.cartao_id) ?? 0) + Number(t.valor));
  });

  const rows: CardUsageRow[] = (cards.data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    ultimos_digitos: c.ultimos_digitos,
    fatura: byCard.get(c.id) ?? 0
  }));

  return { rows, isLoading: cards.isLoading || spend.isLoading };
}
