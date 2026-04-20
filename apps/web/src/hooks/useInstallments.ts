import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const InstallmentInputSchema = z.object({
  workspace_id: z.string().uuid(),
  cartao_id: z.string().uuid(),
  valor_total: z.number().positive().multipleOf(0.01),
  parcelas: z.number().int().min(2, 'mínimo 2 parcelas').max(60),
  descricao: z.string().min(1).max(200),
  categoria_id: z.string().uuid().nullable(),
  data_compra: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
export type InstallmentInput = z.infer<typeof InstallmentInputSchema>;

export function useCreateInstallments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InstallmentInput): Promise<string> => {
      const parsed = InstallmentInputSchema.parse(input);
      const { data, error } = await supabase.rpc('create_installments', {
        p_workspace_id: parsed.workspace_id,
        p_cartao_id: parsed.cartao_id,
        p_valor_total: parsed.valor_total,
        p_parcelas: parsed.parcelas,
        p_descricao: parsed.descricao,
        p_categoria_id: parsed.categoria_id,
        p_data_compra: parsed.data_compra
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}
