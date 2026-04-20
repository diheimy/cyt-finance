import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptInvite } from '@/hooks/useWorkspace';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { user, loading } = useAuth();
  const accept = useAcceptInvite();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || loading || !user || status !== 'idle') return;
    setStatus('accepting');
    accept
      .mutateAsync(token)
      .then(() => {
        setStatus('accepted');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      })
      .catch((err: unknown) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'invalid_or_expired_invite');
      });
  }, [token, loading, user, status, accept, navigate]);

  if (!token) {
    return (
      <CenterCard>
        <h1 className="font-display text-2xl mb-2">Link inválido</h1>
        <p className="text-slate-600">O convite não contém um token válido.</p>
      </CenterCard>
    );
  }

  if (loading) return <CenterCard>Carregando…</CenterCard>;

  if (!user) {
    return (
      <CenterCard>
        <h1 className="font-display text-2xl mb-2">Você foi convidado!</h1>
        <p className="text-slate-600 mb-4">
          Para aceitar este convite, faça login ou crie uma conta. Voltaremos aqui automaticamente.
        </p>
        <Link
          to="/login"
          state={{ from: `/accept-invite?token=${encodeURIComponent(token)}` }}
          className="inline-block bg-slate-900 text-white rounded-lg px-4 py-2 font-semibold"
        >
          Entrar / Criar conta
        </Link>
      </CenterCard>
    );
  }

  if (status === 'accepting') return <CenterCard>Processando convite…</CenterCard>;
  if (status === 'accepted')
    return <CenterCard>🎉 Convite aceito! Redirecionando para o dashboard…</CenterCard>;
  if (status === 'error')
    return (
      <CenterCard>
        <h1 className="font-display text-2xl mb-2">Convite inválido</h1>
        <p className="text-slate-600">{error}</p>
      </CenterCard>
    );

  return <CenterCard>Carregando…</CenterCard>;
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        {children}
      </div>
    </main>
  );
}
