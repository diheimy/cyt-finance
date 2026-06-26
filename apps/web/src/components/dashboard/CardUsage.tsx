import { Card, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/utils/format';
import type { CardUsageRow } from '@/hooks/useCardUsage';

export function CardUsage({ rows }: { rows: CardUsageRow[] }) {
  const maxFatura = Math.max(1, ...rows.map((r) => r.fatura));
  return (
    <Card>
      <CardTitle>Faturas do mês por cartão</CardTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhum cartão cadastrado.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text">
                  {c.nome} <span className="font-mono text-muted">•••• {c.ultimos_digitos}</span>
                </span>
                <span className="text-muted">{formatMoney(c.fatura)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(c.fatura / maxFatura) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
