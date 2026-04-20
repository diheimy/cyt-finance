import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';

const NAV = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/transactions', label: 'Transações', icon: '💸' },
  { to: '/recurring', label: 'Recorrentes', icon: '🔁' },
  { to: '/investments', label: 'Investim.', icon: '📈' },
  { to: '/debts', label: 'Dívidas', icon: '🧾' },
  { to: '/cards', label: 'Cartões', icon: '💳' },
  { to: '/audit', label: 'Auditoria', icon: '🛡️' },
  { to: '/members', label: 'Membros', icon: '👥' }
] as const;

export default function AppShell({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-60">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 flex-col p-4">
        <h1 className="font-display text-2xl mb-1">CYT Finance</h1>
        {active && (
          <p className="text-xs text-slate-500 mb-6">
            {active.nome} · {active.role}
          </p>
        )}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="text-sm text-slate-500 hover:text-slate-900 text-left px-3 py-2"
        >
          Sair
        </button>
      </aside>

      <nav className="md:hidden fixed inset-x-0 bottom-0 bg-white border-t border-slate-200 flex overflow-x-auto">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex-1 min-w-[64px] flex flex-col items-center py-2 text-[10px] ${
                isActive ? 'text-slate-900 font-semibold' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="max-w-4xl mx-auto">{children ?? <Outlet />}</div>
    </div>
  );
}
