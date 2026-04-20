import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuditLogRow {
  id: number;
  workspace_id: string;
  user_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  user: { id: string; nome: string; avatar_url: string | null } | null;
}

export interface AuditFilters {
  workspace_id: string;
  entidade?: string;
  user_id?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function useAuditLogs(filters: AuditFilters | null) {
  return useQuery({
    queryKey: ['audit', filters],
    enabled: !!filters,
    queryFn: async (): Promise<AuditLogRow[]> => {
      const f = filters!;
      let q = supabase
        .from('audit_logs')
        .select(
          'id, workspace_id, user_id, acao, entidade, entidade_id, payload, created_at, user:profiles!audit_logs_user_id_fkey(id, nome, avatar_url)'
        )
        .eq('workspace_id', f.workspace_id)
        .order('created_at', { ascending: false })
        .limit(f.limit ?? 100);
      if (f.entidade) q = q.eq('entidade', f.entidade);
      if (f.user_id) q = q.eq('user_id', f.user_id);
      if (f.from) q = q.gte('created_at', f.from);
      if (f.to) q = q.lte('created_at', f.to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AuditLogRow[];
    }
  });
}

const ENTIDADES_CONHECIDAS = [
  'transactions',
  'cards',
  'categories',
  'recurring',
  'investments',
  'debts'
] as const;

export const AUDIT_ENTIDADES: readonly string[] = ENTIDADES_CONHECIDAS;
