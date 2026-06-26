import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'signin' | 'signup';

export default function Login() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') await signInWithPassword(email, password);
      else await signUpWithPassword(email, password, nome);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro_desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro_google');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-sm border border-border p-8">
        <h1 className="font-display text-3xl text-text mb-1">Dom Finance</h1>
        <p className="text-muted text-sm mb-6">
          {mode === 'signin' ? 'Entre para gerenciar suas finanças' : 'Crie sua conta'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <label className="block">
              <span className="text-sm font-medium text-text">Nome</span>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium text-text">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-text">Senha</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white rounded-lg py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Carregando…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-2" />
          <span className="text-xs text-muted">OU</span>
          <div className="h-px flex-1 bg-surface-2" />
        </div>

        <button
          onClick={google}
          type="button"
          className="w-full border border-border rounded-lg py-2 font-medium hover:bg-bg"
        >
          Continuar com Google
        </button>

        <p className="text-center text-sm text-muted mt-6">
          {mode === 'signin' ? (
            <>
              Não tem conta?{' '}
              <button onClick={() => setMode('signup')} className="text-text font-medium">
                Criar agora
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button onClick={() => setMode('signin')} className="text-text font-medium">
                Entrar
              </button>
            </>
          )}
        </p>
        <p className="text-center text-xs text-muted mt-2">
          <Link to="/reset-password">Esqueci minha senha</Link>
        </p>
      </div>
    </main>
  );
}
