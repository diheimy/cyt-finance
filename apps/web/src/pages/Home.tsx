import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';
import { useDashboard } from '@/hooks/useDashboard';
import { useNetWorth } from '@/hooks/useNetWorth';
import { useUpcomingBills } from '@/hooks/useUpcomingBills';
import { useCardUsage } from '@/hooks/useCardUsage';
import { useHealthReport, useAnalyzeHealth } from '@/hooks/useHealthReport';
import MonthlyBars from '@/components/charts/MonthlyBars';
import LeakageDonut from '@/components/charts/LeakageDonut';
import PreviousMonths from '@/components/charts/PreviousMonths';
import ExportPdfButton from '@/components/ExportPdfButton';
import { Card, CardTitle } from '@/components/ui/card';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';
import { HealthCard } from '@/components/dashboard/HealthCard';
import { UpcomingBills } from '@/components/dashboard/UpcomingBills';
import { CardUsage } from '@/components/dashboard/CardUsage';
import { HealthMetrics } from '@/components/dashboard/HealthMetrics';
import { savingsRate, debtBurden } from '@/utils/health-metrics';
import { currentMonthKey, formatMoney } from '@/utils/format';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { data: workspaces, isLoading: loadingWs } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);
  const [month, setMonth] = useState(currentMonthKey());

  const dash = useDashboard(active?.id, month);
  const netWorth = useNetWorth(active?.id);
  const bills = useUpcomingBills(active?.id);
  const cardUsage = useCardUsage(active?.id, month);
  const healthReport = useHealthReport(active?.id, month);
  const analyze = useAnalyzeHealth(active?.id, month);

  // Espera auth terminar ANTES de decidir redirect. Sem esse gate, user
  // recém-criado cai em loop: user ainda undefined → useWorkspaces disabled
  // → data=undefined → Navigate to /create-workspace → cria → volta pra /
  // → user ainda undefined → redireciona de novo.
  if (authLoading || !user) return <p className="p-6">Carregando…</p>;
  if (loadingWs) return <p className="p-6">Carregando…</p>;
  if (!workspaces || workspaces.length === 0) return <Navigate to="/create-workspace" replace />;
  if (!active) return <p className="p-6">Carregando workspace…</p>;

  const { mes, caixa, bars, donut, history } = dash.summary;
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  const parcelasDividas = bills.items
    .filter((b) => b.origem === 'dívida')
    .reduce((s, b) => s + b.valor, 0);
  const taxaPoupanca = savingsRate(mes.entradas, mes.saidas);
  const comprometimento = debtBurden(parcelasDividas, mes.entradas);
  const mesesReserva = mes.saidas > 0 ? caixa / mes.saidas : 0;

  return (
    <section className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Olá, {user?.email?.split('@')[0]}</h1>
          <p className="text-muted text-sm capitalize">
            {active.nome} · {monthLabel}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          />
          <ExportPdfButton workspaceId={active.id} defaultMonth={month} />
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Entradas" value={formatMoney(mes.entradas)} color="text-positive" />
        <StatCard label="Saídas" value={formatMoney(mes.saidas)} color="text-negative" />
        <StatCard
          label="Resultado"
          value={formatMoney(mes.resultado)}
          color={mes.resultado >= 0 ? 'text-positive' : 'text-negative'}
        />
        <StatCard
          label="Caixa"
          value={formatMoney(caixa)}
          color={caixa >= 0 ? 'text-text' : 'text-negative'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NetWorthCard
          investido={netWorth.investido}
          dividas={netWorth.dividas}
          patrimonio={netWorth.patrimonio}
        />
        <HealthMetrics
          taxaPoupanca={taxaPoupanca}
          comprometimento={comprometimento}
          mesesReserva={mesesReserva}
        />
        <UpcomingBills items={bills.items} total={bills.total} />
        <CardUsage rows={cardUsage.rows} />
      </div>

      <HealthCard
        report={healthReport.data ?? null}
        loading={analyze.isPending}
        onAnalyze={() => analyze.mutate()}
      />

      {dash.isLoading && <p className="text-sm text-muted">Carregando gráficos…</p>}
      {dash.isError && (
        <p className="text-sm text-negative">
          Erro ao carregar dashboard: {(dash.error as Error).message}
        </p>
      )}

      <Card>
        <CardTitle>Últimos 6 meses</CardTitle>
        <MonthlyBars data={bars} />
      </Card>

      <Card>
        <CardTitle>Vazamento de caixa — gastos por categoria</CardTitle>
        <LeakageDonut data={donut} />
      </Card>

      <Card>
        <CardTitle>Histórico (últimos 12 meses)</CardTitle>
        <PreviousMonths rows={history} onSelect={(m) => setMonth(m)} />
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Link
          to="/transactions"
          className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Ver transações
        </Link>
        <Link
          to="/audit"
          className="border border-border text-text rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Auditoria
        </Link>
        <Link
          to="/members"
          className="border border-border text-text rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Membros
        </Link>
      </div>
    </section>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-semibold text-xl md:text-2xl mt-1 ${color}`}>{value}</p>
    </div>
  );
}
