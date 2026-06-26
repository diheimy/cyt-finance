import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/utils/format';
import type { UpcomingBill } from '@/hooks/useUpcomingBills';

export function UpcomingBills({ items, total }: { items: UpcomingBill[]; total: number }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Contas a pagar</CardTitle>
        <span className="text-sm font-semibold text-text">{formatMoney(total)}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma conta prevista.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 8).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Badge tone={b.origem === 'dívida' ? 'warn' : 'neutral'}>{b.origem}</Badge>
                <span className="truncate text-text">{b.label}</span>
              </span>
              <span className="text-muted">{formatMoney(b.valor)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
