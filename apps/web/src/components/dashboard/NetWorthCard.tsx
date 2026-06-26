import { Card, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/utils/format';

export function NetWorthCard({
  investido,
  dividas,
  patrimonio
}: {
  investido: number;
  dividas: number;
  patrimonio: number;
}) {
  return (
    <Card>
      <CardTitle>Patrimônio líquido</CardTitle>
      <p className={`text-3xl font-bold ${patrimonio >= 0 ? 'text-positive' : 'text-negative'}`}>
        {formatMoney(patrimonio)}
      </p>
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Investido</span>
          <span className="text-text">{formatMoney(investido)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Dívidas em aberto</span>
          <span className="text-negative">{formatMoney(dividas)}</span>
        </div>
      </div>
    </Card>
  );
}
