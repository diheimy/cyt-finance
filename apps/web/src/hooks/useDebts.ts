import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const DebtKindSchema = z.enum(['receber', 'pagar']);
export type DebtKind = z.infer<typeof DebtKindSchema>;

export const DebtInputSchema = z.object({
  workspace_id: z.string().uuid(),
  tipo: DebtKindSchema,
  pessoa: z.string().min(1).max(100),
  valor_total: z.number().positive().multipleOf(0.01),
  parcelas_total: z.number().int().min(1).max(600),
  descricao: z.string().max(200).nullable(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
export type DebtInput = z.infer<typeof DebtInputSchema>;

export interface DebtRow {
  id: string;
  workspace_id: string;
  tipo: DebtKind;
  pessoa: string;
  valor_total: number;
  parcelas_total: number;
  parcelas_pagas: number;
  descricao: string | null;
  data_inicio: string;
  quitada_em: string | null;
  created_by: string;
  created_at: string;
}

export function useDebts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['debts', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<DebtRow[]> => {
      const { data, error } = await supabase
        .from('debts')
        .select(
          'id, workspace_id, tipo, pessoa, valor_total, parcelas_total, parcelas_pagas, descricao, data_inicio, quitada_em, created_by, created_at'
        )
        .eq('workspace_id', workspaceId!)
        .order('quitada_em', { ascending: true, nullsFirst: true })
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });
}

export function useCreateDebt(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DebtInput & { created_by: string }) => {
      const parsed = DebtInputSchema.parse(input);
      const { data, error } = await supabase
        .from('debts')
        .insert({ ...parsed, created_by: input.created_by })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts', workspaceId] })
  });
}

export function usePayInstallment(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (debt: DebtRow) => {
      if (debt.quitada_em) throw new Error('debt_already_settled');
      if (debt.parcelas_pagas >= debt.parcelas_total) throw new Error('no_more_installments');
      const novasPagas = debt.parcelas_pagas + 1;
      const quitada = novasPagas >= debt.parcelas_total ? new Date().toISOString() : null;
      const patch: { parcelas_pagas: number; quitada_em?: string | null } = {
        parcelas_pagas: novasPagas
      };
      if (quitada) patch.quitada_em = quitada;
      const { data, error } = await supabase
        .from('debts')
        .update(patch)
        .eq('id', debt.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts', workspaceId] })
  });
}

export function useUndoInstallment(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (debt: DebtRow) => {
      if (debt.parcelas_pagas <= 0) throw new Error('no_installments_paid');
      const { data, error } = await supabase
        .from('debts')
        .update({ parcelas_pagas: debt.parcelas_pagas - 1, quitada_em: null })
        .eq('id', debt.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts', workspaceId] })
  });
}

export function useDeleteDebt(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts', workspaceId] })
  });
}
