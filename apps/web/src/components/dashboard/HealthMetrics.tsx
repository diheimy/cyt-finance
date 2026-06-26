import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Tone = 'positive' | 'warn' | 'negative';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

export function HealthMetrics({
  taxaPoupanca,
  comprometimento,
  mesesReserva
}: {
  taxaPoupanca: number;
  comprometimento: number;
  mesesReserva: number;
}) {
  const poupTone: Tone = taxaPoupanca >= 0.2 ? 'positive' : taxaPoupanca >= 0.05 ? 'warn' : 'negative';
  const compTone: Tone =
    comprometimento <= 0.3 ? 'positive' : comprometimento <= 0.5 ? 'warn' : 'negative';
  const resTone: Tone = mesesReserva >= 3 ? 'positive' : mesesReserva >= 1 ? 'warn' : 'negative';

  return (
    <Card>
      <CardTitle>Indicadores</CardTitle>
      <div className="space-y-3">
        <Metric label="Taxa de poupança" value={pct(taxaPoupanca)} tone={poupTone} />
        <Metric label="Comprometimento com dívida" value={pct(comprometimento)} tone={compTone} />
        <Metric label="Reserva de caixa" value={`${mesesReserva.toFixed(1)} meses`} tone={resTone} />
      </div>
    </Card>
  );
}
