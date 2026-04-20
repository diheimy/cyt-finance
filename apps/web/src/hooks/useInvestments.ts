import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const InvestmentInputSchema = z.object({
  workspace_id: z.string().uuid(),
  valor: z.number().positive().multipleOf(0.01),
  descricao: z.string().min(1).max(200),
  categoria: z.string().min(1).max(50),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
export type InvestmentInput = z.infer<typeof InvestmentInputSchema>;

export interface InvestmentRow {
  id: string;
  workspace_id: string;
  valor: number;
  descricao: string;
  categoria: string;
  data: string;
  created_by: string;
  created_at: string;
}

export function useInvestments(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['investments', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<InvestmentRow[]> => {
      const { data, error } = await supabase
        .from('investments')
        .select('id, workspace_id, valor, descricao, categoria, data, created_by, created_at')
        .eq('workspace_id', workspaceId!)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });
}

export function useCreateInvestment(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvestmentInput & { created_by: string }) => {
      const parsed = InvestmentInputSchema.parse(input);
      const { data, error } = await supabase
        .from('investments')
        .insert({ ...parsed, created_by: input.created_by })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments', workspaceId] })
  });
}

export function useDeleteInvestment(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('investments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments', workspaceId] })
  });
}
