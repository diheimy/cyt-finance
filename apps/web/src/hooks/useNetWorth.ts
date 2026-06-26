import { useInvestments } from '@/hooks/useInvestments';
import { useDebts } from '@/hooks/useDebts';

export interface NetWorth {
  investido: number;
  dividas: number;
  patrimonio: number;
  isLoading: boolean;
}

export function useNetWorth(workspaceId: string | undefined): NetWorth {
  const inv = useInvestments(workspaceId);
  const debts = useDebts(workspaceId);

  const investido = (inv.data ?? []).reduce((s, i) => s + Number(i.valor), 0);
  const dividas = (debts.data ?? [])
    .filter((d) => !d.quitada_em && d.tipo === 'pagar')
    .reduce(
      (s, d) => s + (Number(d.valor_total) - Number(d.valor_total) * (d.parcelas_pagas / d.parcelas_total)),
      0
    );

  return {
    investido,
    dividas,
    patrimonio: investido - dividas,
    isLoading: inv.isLoading || debts.isLoading
  };
}
