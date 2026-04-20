import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Category, CategoryKind } from '@/types/schemas';

export function useCategories(workspaceId: string | undefined, tipo?: CategoryKind) {
  return useQuery({
    queryKey: ['categories', workspaceId, tipo ?? 'all'],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Category[]> => {
      let q = supabase
        .from('categories')
        .select('id, workspace_id, nome, tipo, cor, icone')
        .eq('workspace_id', workspaceId!);
      if (tipo) q = q.eq('tipo', tipo);
      const { data, error } = await q.order('nome');
      if (error) throw error;
      return (data ?? []) as Category[];
    }
  });
}
