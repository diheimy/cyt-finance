import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAnon, RequireAuth } from '@/components/RouteGuard';
import AppShell from '@/components/layout/AppShell';
import Login from '@/pages/Login';
import AuthCallback from '@/pages/AuthCallback';
import CreateWorkspace from '@/pages/CreateWorkspace';
import AcceptInvite from '@/pages/AcceptInvite';
import Members from '@/pages/Members';
import Home from '@/pages/Home';
import Transactions from '@/pages/Transactions';
import Cards from '@/pages/Cards';
import Recurring from '@/pages/Recurring';
import Investments from '@/pages/Investments';
import Debts from '@/pages/Debts';
import Audit from '@/pages/Audit';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RequireAnon><Login /></RequireAnon>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/create-workspace" element={<RequireAuth><CreateWorkspace /></RequireAuth>} />

      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/members" element={<Members />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
