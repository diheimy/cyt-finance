import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { TransactionKindSchema } from '@/types/schemas';

export const RecurringInputSchema = z.object({
  workspace_id: z.string().uuid(),
  tipo: TransactionKindSchema,
  valor: z.number().positive().multipleOf(0.01),
  descricao: z.string().min(1).max(200),
  categoria_id: z.string().uuid().nullable(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  limite_parcelas: z.number().int().min(0).default(0)
});
export type RecurringInput = z.infer<typeof RecurringInputSchema>;

export interface RecurringRow {
  id: string;
  workspace_id: string;
  tipo: 'gasto' | 'entrada';
  valor: number;
  descricao: string;
  categoria_id: string | null;
  data_inicio: string;
  limite_parcelas: number;
  parcelas_materializadas: number;
  ativo: boolean;
  created_by: string;
  created_at: string;
  categoria: { id: string; nome: string; cor: string | null } | null;
}

export function useRecurring(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['recurring', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<RecurringRow[]> => {
      const { data, error } = await supabase
        .from('recurring')
        .select(
          'id, workspace_id, tipo, valor, descricao, categoria_id, data_inicio, limite_parcelas, parcelas_materializadas, ativo, created_by, created_at, categoria:categories(id, nome, cor)'
        )
        .eq('workspace_id', workspaceId!)
        .order('ativo', { ascending: false })
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RecurringRow[];
    }
  });
}

export function useCreateRecurring(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecurringInput & { created_by: string }) => {
      const parsed = RecurringInputSchema.parse(input);
      const { data, error } = await supabase
        .from('recurring')
        .insert({ ...parsed, created_by: input.created_by })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring', workspaceId] })
  });
}

export function useUpdateRecurring(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch
    }: {
      id: string;
      patch: Partial<{ ativo: boolean; limite_parcelas: number; valor: number; descricao: string }>;
    }) => {
      const { data, error } = await supabase
        .from('recurring')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring', workspaceId] })
  });
}

export function useDeleteRecurring(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring', workspaceId] })
  });
}
