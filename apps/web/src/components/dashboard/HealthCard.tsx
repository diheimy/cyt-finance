import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HealthReport } from '@/hooks/useHealthReport';

const toneByNivel = { saudavel: 'positive', atencao: 'warn', critico: 'negative' } as const;

export function HealthCard({
  report,
  loading,
  onAnalyze
}: {
  report: HealthReport | null;
  loading: boolean;
  onAnalyze: () => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Saúde Financeira</CardTitle>
        <Button size="sm" variant="outline" onClick={onAnalyze} disabled={loading}>
          {loading ? 'Analisando…' : report ? 'Reanalisar' : 'Analisar agora'}
        </Button>
      </div>
      {!report ? (
        <p className="text-sm text-muted">Sem análise ainda. Clique em “Analisar agora”.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-text">{report.score}</span>
            <Badge tone={toneByNivel[report.nivel]}>{report.nivel}</Badge>
          </div>
          <Section title="Pontos positivos" items={report.positivos} tone="text-positive" />
          <Section title="Pontos de atenção" items={report.atencao} tone="text-warn" />
          <Section title="Recomendações" items={report.recomendacoes} tone="text-muted" />
        </div>
      )}
    </Card>
  );
}

function Section({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={i} className={tone}>
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
