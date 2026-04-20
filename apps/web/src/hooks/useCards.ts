import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export const CardInputSchema = z.object({
  workspace_id: z.string().uuid(),
  nome: z.string().min(1, 'nome obrigatório').max(80),
  ultimos_digitos: z.string().regex(/^\d{4}$/, 'deve ter 4 dígitos'),
  dia_fechamento: z.coerce.number().int().min(1).max(31)
});
export type CardInput = z.infer<typeof CardInputSchema>;

export interface Card {
  id: string;
  workspace_id: string;
  nome: string;
  ultimos_digitos: string;
  dia_fechamento: number;
  created_at: string;
}

export function useCards(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['cards', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Card[]> => {
      const { data, error } = await supabase
        .from('cards')
        .select('id, workspace_id, nome, ultimos_digitos, dia_fechamento, created_at')
        .eq('workspace_id', workspaceId!)
        .order('nome');
      if (error) throw error;
      return data ?? [];
    }
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CardInput) => {
      const parsed = CardInputSchema.parse(input);
      const { data, error } = await supabase.from('cards').insert(parsed).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, input) =>
      qc.invalidateQueries({ queryKey: ['cards', input.workspace_id] })
  });
}

export function useUpdateCard(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch
    }: {
      id: string;
      patch: Partial<Omit<CardInput, 'workspace_id'>>;
    }) => {
      const { data, error } = await supabase
        .from('cards')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards', workspaceId] })
  });
}

export function useDeleteCard(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards', workspaceId] })
  });
}
