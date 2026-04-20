import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate(data.session ? '/' : '/login', { replace: true });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Finalizando login…</p>
    </main>
  );
}
