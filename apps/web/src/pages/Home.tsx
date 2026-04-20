import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';
import { useDashboard } from '@/hooks/useDashboard';
import MonthlyBars from '@/components/charts/MonthlyBars';
import LeakageDonut from '@/components/charts/LeakageDonut';
import PreviousMonths from '@/components/charts/PreviousMonths';
import ExportPdfButton from '@/components/ExportPdfButton';
import { currentMonthKey, formatMoney } from '@/utils/format';

export default function Home() {
  const { user } = useAuth();
  const { data: workspaces, isLoading: loadingWs } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);
  const [month, setMonth] = useState(currentMonthKey());

  const dash = useDashboard(active?.id, month);

  if (loadingWs) return <p className="p-6">Carregando…</p>;
  if (!workspaces || workspaces.length === 0) return <Navigate to="/create-workspace" replace />;
  if (!active) return <p className="p-6">Nenhum workspace ativo.</p>;

  const { mes, caixa, bars, donut, history } = dash.summary;
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <section className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Olá, {user?.email?.split('@')[0]}</h1>
          <p className="text-slate-500 text-sm capitalize">
            {active.nome} · {monthLabel}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <ExportPdfButton workspaceId={active.id} defaultMonth={month} />
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Entradas" value={formatMoney(mes.entradas)} color="text-emerald-600" />
        <StatCard label="Saídas" value={formatMoney(mes.saidas)} color="text-red-600" />
        <StatCard
          label="Resultado"
          value={formatMoney(mes.resultado)}
          color={mes.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <StatCard
          label="Caixa"
          value={formatMoney(caixa)}
          color={caixa >= 0 ? 'text-blue-600' : 'text-red-600'}
        />
      </div>

      {dash.isLoading && <p className="text-sm text-slate-500">Carregando gráficos…</p>}
      {dash.isError && (
        <p className="text-sm text-red-600">
          Erro ao carregar dashboard: {(dash.error as Error).message}
        </p>
      )}

      <Panel title="Últimos 6 meses">
        <MonthlyBars data={bars} />
      </Panel>

      <Panel title="Vazamento de caixa — gastos por categoria">
        <LeakageDonut data={donut} />
      </Panel>

      <Panel title="Histórico (últimos 12 meses)">
        <PreviousMonths rows={history} onSelect={(m) => setMonth(m)} />
      </Panel>

      <div className="flex gap-3 flex-wrap">
        <Link
          to="/transactions"
          className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Ver transações
        </Link>
        <Link
          to="/audit"
          className="border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          🛡️ Auditoria
        </Link>
        <Link
          to="/members"
          className="border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Membros
        </Link>
      </div>
    </section>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`font-semibold text-xl md:text-2xl mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-slate-200 p-4 md:p-6">
      <h2 className="font-semibold text-slate-800 mb-4">{title}</h2>
      {children}
    </section>
  );
}
