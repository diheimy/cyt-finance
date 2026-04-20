import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  caixaAcumulado,
  historyMonths,
  leakageByCategory,
  monthlyBars,
  monthTotals,
  type TxLite
} from '@/utils/aggregate';

const DEFAULT_MONTHS_WINDOW = 13; // 12 anteriores + mês atual

function windowStart(referenceMonth: string, monthsBack: number): string {
  const [y, m] = referenceMonth.split('-').map(Number);
  const d = new Date(y, m - 1 - (monthsBack - 1), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(
    last.getDate()
  ).padStart(2, '0')}`;
}

interface RawTx {
  id: string;
  tipo: 'gasto' | 'entrada';
  valor: number | string;
  data: string;
  paga: boolean;
  categoria_id: string | null;
  categoria: { id: string; nome: string; cor: string | null } | null;
}

export function useDashboard(workspaceId: string | undefined, referenceMonth: string) {
  const raw = useQuery({
    queryKey: ['dashboard', workspaceId, referenceMonth],
    enabled: !!workspaceId,
    queryFn: async (): Promise<{ window: TxLite[]; allPaid: TxLite[] }> => {
      const start = windowStart(referenceMonth, DEFAULT_MONTHS_WINDOW);
      const end = monthEnd(referenceMonth);

      // Janela principal (últimos 13 meses) — detalhes por mês
      const { data: windowRows, error: e1 } = await supabase
        .from('transactions')
        .select(
          'id, tipo, valor, data, paga, categoria_id, categoria:categories(id, nome, cor)'
        )
        .eq('workspace_id', workspaceId!)
        .gte('data', start)
        .lte('data', end)
        .order('data', { ascending: true });
      if (e1) throw e1;

      // Todas as transações pagas para calcular caixa acumulado correto
      const { data: allPaidRows, error: e2 } = await supabase
        .from('transactions')
        .select('tipo, valor, data, paga, categoria_id')
        .eq('workspace_id', workspaceId!)
        .eq('paga', true)
        .order('data', { ascending: true });
      if (e2) throw e2;

      const mapRow = (r: RawTx): TxLite => ({
        tipo: r.tipo,
        valor: r.valor,
        data: r.data,
        paga: r.paga,
        categoria_id: r.categoria_id,
        categoria_nome: r.categoria?.nome ?? null,
        categoria_cor: r.categoria?.cor ?? null
      });

      return {
        window: (windowRows ?? []).map((r) => mapRow(r as unknown as RawTx)),
        allPaid: (allPaidRows ?? []).map((r) => ({
          tipo: r.tipo,
          valor: r.valor,
          data: r.data,
          paga: r.paga,
          categoria_id: r.categoria_id
        }))
      };
    }
  });

  const summary = useMemo(() => {
    const window = raw.data?.window ?? [];
    const allPaid = raw.data?.allPaid ?? [];
    const monthTx = window.filter((t) => t.data.slice(0, 7) === referenceMonth);
    return {
      mes: monthTotals(monthTx),
      caixa: caixaAcumulado(allPaid, monthEnd(referenceMonth)),
      bars: monthlyBars(window, referenceMonth, 6),
      donut: leakageByCategory(window, referenceMonth),
      history: historyMonths(window, referenceMonth, 12)
    };
  }, [raw.data, referenceMonth]);

  return { ...raw, summary };
}
