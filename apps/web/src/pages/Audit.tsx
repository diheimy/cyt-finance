import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';
import { AUDIT_ENTIDADES, useAuditLogs, type AuditFilters } from '@/hooks/useAuditLogs';

const ACAO_LABEL: Record<string, string> = {
  insert: '➕ criou',
  update: '✏️ editou',
  delete: '🗑️ excluiu'
};

const ENTIDADE_LABEL: Record<string, string> = {
  transactions: 'transação',
  cards: 'cartão',
  categories: 'categoria',
  recurring: 'regra recorrente',
  investments: 'investimento',
  debts: 'dívida'
};

export default function Audit() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);

  const [entidade, setEntidade] = useState('');
  const [days, setDays] = useState(30);

  const filters = useMemo<AuditFilters | null>(() => {
    if (!active) return null;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return {
      workspace_id: active.id,
      entidade: entidade || undefined,
      from,
      limit: 200
    };
  }, [active, entidade, days]);

  const logs = useAuditLogs(filters);

  if (!active) return <p className="p-6">Carregando workspace…</p>;

  return (
    <section className="p-6 space-y-6">
      <header>
        <h1 className="font-display text-2xl">🛡️ Auditoria</h1>
        <p className="text-slate-500 text-sm">
          Histórico completo de ações no workspace. Toda criação, edição e exclusão é registrada.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={entidade}
          onChange={(e) => setEntidade(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as entidades</option>
          {AUDIT_ENTIDADES.map((e) => (
            <option key={e} value={e}>
              {ENTIDADE_LABEL[e] ?? e}
            </option>
          ))}
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
          <option value={365}>Último ano</option>
        </select>
      </div>

      {logs.isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}
      {logs.isError && (
        <p className="text-red-600 text-sm">
          Erro ao carregar: {(logs.error as Error).message}
        </p>
      )}

      {(logs.data ?? []).length === 0 && !logs.isLoading && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500 text-sm">
          Nenhuma ação registrada no período.
        </div>
      )}

      <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
        {(logs.data ?? []).map((log) => {
          const acao = ACAO_LABEL[log.acao] ?? log.acao;
          const entLabel = ENTIDADE_LABEL[log.entidade] ?? log.entidade;
          const resumo = summarizePayload(log.payload, log.acao);
          return (
            <li key={log.id} className="p-3 text-sm">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="font-medium">
                  {log.user?.nome ?? 'sistema'} {acao} {entLabel}
                </span>
                {resumo && <span className="text-slate-500 truncate">— {resumo}</span>}
                <span className="ml-auto text-xs text-slate-400 shrink-0">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function summarizePayload(
  payload: Record<string, unknown> | null,
  acao: string
): string {
  if (!payload) return '';
  const obj = acao === 'delete' ? payload.old : payload.new;
  if (!obj || typeof obj !== 'object') return '';
  const rec = obj as Record<string, unknown>;
  const desc = typeof rec.descricao === 'string' ? rec.descricao : null;
  const nome = typeof rec.nome === 'string' ? rec.nome : null;
  const pessoa = typeof rec.pessoa === 'string' ? rec.pessoa : null;
  return desc ?? nome ?? pessoa ?? '';
}
