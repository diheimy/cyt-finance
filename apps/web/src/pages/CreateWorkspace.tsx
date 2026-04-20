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
      setError(err instanceof Error ? err.message : 'erro_criar_workspace');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="font-display text-2xl mb-1">Crie seu primeiro workspace</h1>
        <p className="text-slate-500 text-sm mb-6">
          Dê um nome para o espaço onde você e sua família gerenciarão as finanças.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nome do workspace</span>
            <input
              type="text"
              required
              maxLength={80}
              placeholder="Ex: Família Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={create.isPending || !nome.trim()}
            className="w-full bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
          >
            {create.isPending ? 'Criando…' : 'Criar workspace'}
          </button>
        </form>
      </div>
    </main>
  );
}
