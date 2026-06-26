import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCreateWorkspace } from '@/hooks/useWorkspace';

export default function CreateWorkspace() {
  const { user } = useAuth();
  const [nome, setNome] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useCreateWorkspace();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError('Sessão ainda carregando, aguarde…');
      return;
    }
    try {
      await create.mutateAsync({ nome: nome.trim(), ownerId: user.id });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as { message?: string })?.message ?? JSON.stringify(err));
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-sm border border-border p-8">
        <h1 className="font-display text-2xl mb-1">Crie seu primeiro workspace</h1>
        <p className="text-muted text-sm mb-6">
          Dê um nome para o espaço onde você e sua família gerenciarão as finanças.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-text">Nome do workspace</span>
            <input
              type="text"
              required
              maxLength={80}
              placeholder="Ex: Família Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={create.isPending || !nome.trim()}
            className="w-full bg-accent text-white rounded-lg py-2 font-semibold disabled:opacity-50"
          >
            {create.isPending ? 'Criando…' : 'Criar workspace'}
          </button>
        </form>
      </div>
    </main>
  );
}
