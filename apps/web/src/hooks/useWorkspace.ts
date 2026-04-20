import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'cyt:active_workspace_id';

export interface Workspace {
  id: string;
  nome: string;
  owner_id: string;
  created_at: string;
  role: 'owner' | 'editor' | 'viewer';
}

export function useWorkspaces(userId: string | undefined) {
  return useQuery({
    queryKey: ['workspaces', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Workspace[]> => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role, workspace:workspaces(id, nome, owner_id, created_at)')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data ?? [])
        .filter((r) => r.workspace !== null)
        .map((r) => ({
          ...(r.workspace as NonNullable<typeof r.workspace>),
          role: r.role
        }));
    }
  });
}

export function useActiveWorkspace(workspaces: Workspace[] | undefined) {
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    const current = workspaces.find((w) => w.id === activeId);
    if (!current) {
      const first = workspaces[0].id;
      setActiveId(first);
      localStorage.setItem(STORAGE_KEY, first);
    }
  }, [workspaces, activeId]);

  const switchTo = (id: string) => {
    setActiveId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const active = workspaces?.find((w) => w.id === activeId) ?? null;
  return { activeId, active, switchTo };
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome, ownerId }: { nome: string; ownerId: string }) => {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({ nome, owner_id: ownerId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] })
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc('accept_invite', { p_token: token });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] })
  });
}
