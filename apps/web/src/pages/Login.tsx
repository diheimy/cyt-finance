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
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="font-display text-3xl text-slate-900 mb-1">CYT Finance</h1>
        <p className="text-slate-500 text-sm mb-6">
          {mode === 'signin' ? 'Entre para gerenciar suas finanças' : 'Crie sua conta'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nome</span>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Senha</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
          >
            {loading ? 'Carregando…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">OU</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          onClick={google}
          type="button"
          className="w-full border border-slate-300 rounded-lg py-2 font-medium hover:bg-slate-50"
        >
          Continuar com Google
        </button>

        <p className="text-center text-sm text-slate-500 mt-6">
          {mode === 'signin' ? (
            <>
              Não tem conta?{' '}
              <button onClick={() => setMode('signup')} className="text-slate-900 font-medium">
                Criar agora
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button onClick={() => setMode('signin')} className="text-slate-900 font-medium">
                Entrar
              </button>
            </>
          )}
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">
          <Link to="/reset-password">Esqueci minha senha</Link>
        </p>
      </div>
    </main>
  );
}
