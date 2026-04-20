import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { monthBounds } from '@/utils/format';
import {
  TransactionInputSchema,
  type TransactionFilters,
  type TransactionInput,
  type TransactionRow
} from '@/types/schemas';

type TxRelations = TransactionRow & {
  categoria: { id: string; nome: string; cor: string | null; icone: string | null } | null;
  cartao: { id: string; nome: string; ultimos_digitos: string } | null;
};

export function useTransactions(filters: TransactionFilters | null) {
  return useQuery({
    queryKey: ['transactions', filters],
    enabled: !!filters,
    queryFn: async (): Promise<TxRelations[]> => {
      const f = filters!;
      const { start, end } = monthBounds(f.month);
      let q = supabase
        .from('transactions')
        .select(
          'id, workspace_id, tipo, valor, descricao, data, categoria_id, cartao_id, compra_id, parcela_atual, parcelas_total, paga, recurring_id, created_by, created_at, categoria:categories(id, nome, cor, icone), cartao:cards(id, nome, ultimos_digitos)'
        )
        .eq('workspace_id', f.workspace_id)
        .gte('data', start)
        .lte('data', end)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      if (f.tipo) q = q.eq('tipo', f.tipo);
      if (f.categoria_id) q = q.eq('categoria_id', f.categoria_id);
      if (f.cartao_id) q = q.eq('cartao_id', f.cartao_id);
      if (f.search && f.search.trim().length > 0) {
        q = q.ilike('descricao', `%${f.search.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TxRelations[];
    }
  });
}

export function useCreateTransaction(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput & { created_by: string }) => {
      const parsed = TransactionInputSchema.parse(input);
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...parsed, created_by: input.created_by })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspaceId] });
    }
  });
}

export function useUpdateTransaction(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TransactionInput> }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspaceId] });
    }
  });
}

export function useDeleteTransaction(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard', workspaceId] });
    }
  });
}
