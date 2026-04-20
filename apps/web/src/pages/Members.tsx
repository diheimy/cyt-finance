import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';

interface Member {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  joined_at: string;
  profile: { id: string; nome: string; avatar_url: string | null } | null;
}

interface Invite {
  id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export default function Members() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ['members', active?.id],
    enabled: !!active,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('user_id, role, joined_at, profile:profiles!workspace_members_user_id_fkey(id, nome, avatar_url)')
        .eq('workspace_id', active!.id)
        .order('joined_at');
      if (error) throw error;
      return (data ?? []) as unknown as Member[];
    }
  });

  const invites = useQuery({
    queryKey: ['invites', active?.id],
    enabled: !!active && active.role === 'owner',
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from('invites')
        .select('id, email, expires_at, accepted_at, created_at')
        .eq('workspace_id', active!.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  });

  const createInvite = useMutation({
    mutationFn: async (emailToInvite: string) => {
      if (!active || !user) throw new Error('no_workspace');
      const { error } = await supabase.from('invites').insert({
        workspace_id: active.id,
        email: emailToInvite,
        invited_by: user.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEmail('');
      qc.invalidateQueries({ queryKey: ['invites', active?.id] });
    }
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.from('invites').delete().eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites', active?.id] })
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', active!.id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', active?.id] })
  });

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    try {
      await createInvite.mutateAsync(email);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'erro_convite');
    }
  }

  if (!active) {
    return <main className="p-6">Nenhum workspace ativo.</main>;
  }

  const isOwner = active.role === 'owner';

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="font-display text-2xl">Membros — {active.nome}</h1>
        <p className="text-slate-500 text-sm">Gerencie quem tem acesso a este workspace.</p>
      </header>

      <section>
        <h2 className="font-semibold mb-2">Membros atuais</h2>
        <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
          {(members.data ?? []).map((m) => (
            <li key={m.user_id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium">{m.profile?.nome ?? m.user_id}</p>
                <p className="text-xs text-slate-500">
                  {m.role} · entrou em {new Date(m.joined_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              {isOwner && m.role !== 'owner' && (
                <button
                  onClick={() => removeMember.mutate(m.user_id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <>
          <section>
            <h2 className="font-semibold mb-2">Convidar por e-mail</h2>
            <form onSubmit={submitInvite} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={createInvite.isPending}
                className="bg-slate-900 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
              >
                Convidar
              </button>
            </form>
            {inviteError && <p className="text-sm text-red-600 mt-2">{inviteError}</p>}
          </section>

          <section>
            <h2 className="font-semibold mb-2">Convites pendentes</h2>
            {(invites.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum convite pendente.</p>
            ) : (
              <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
                {(invites.data ?? []).map((i) => (
                  <li key={i.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{i.email}</p>
                      <p className="text-xs text-slate-500">
                        expira em {new Date(i.expires_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={() => revokeInvite.mutate(i.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Revogar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
