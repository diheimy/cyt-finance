import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export function RequireAnon({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function FullscreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-900" />
    </div>
  );
}
