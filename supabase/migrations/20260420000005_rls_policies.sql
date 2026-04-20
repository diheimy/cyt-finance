-- ─────────────────────────────────────────────────────────────
-- F1 — RLS Policies (linha primária de defesa — ADR-005)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── profiles: usuário lê/edita o próprio; outros membros lêem profile dos co-membros
CREATE POLICY "profiles_self_and_co_members_read" ON profiles FOR SELECT USING (
  id = auth.uid()
  OR id IN (
    SELECT wm2.user_id FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
  )
);
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_self_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- ─── workspaces: membros lêem; só owner cria/edita/deleta
CREATE POLICY "ws_member_read" ON workspaces FOR SELECT USING (fn_is_member(id));
CREATE POLICY "ws_create" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ws_owner_update" ON workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "ws_owner_delete" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- ─── workspace_members: membros lêem os membros do mesmo workspace; só owner manipula
CREATE POLICY "wm_member_read" ON workspace_members FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "wm_owner_write" ON workspace_members FOR INSERT WITH CHECK (fn_is_owner(workspace_id));
CREATE POLICY "wm_owner_update" ON workspace_members FOR UPDATE USING (fn_is_owner(workspace_id));
CREATE POLICY "wm_owner_delete" ON workspace_members FOR DELETE USING (fn_is_owner(workspace_id));

-- ─── invites: só owner lê/cria/deleta convites do workspace; aceite é via RPC
CREATE POLICY "invites_owner_read" ON invites FOR SELECT USING (fn_is_owner(workspace_id));
CREATE POLICY "invites_owner_insert" ON invites FOR INSERT WITH CHECK (
  fn_is_owner(workspace_id) AND invited_by = auth.uid()
);
CREATE POLICY "invites_owner_delete" ON invites FOR DELETE USING (fn_is_owner(workspace_id));

-- ─── Padrão para tabelas de domínio: membros lêem; editor+ escreve
-- cards
CREATE POLICY "cards_member_read" ON cards FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "cards_editor_insert" ON cards FOR INSERT WITH CHECK (fn_is_editor(workspace_id));
CREATE POLICY "cards_editor_update" ON cards FOR UPDATE USING (fn_is_editor(workspace_id));
CREATE POLICY "cards_editor_delete" ON cards FOR DELETE USING (fn_is_editor(workspace_id));

-- categories
CREATE POLICY "cats_member_read" ON categories FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "cats_editor_insert" ON categories FOR INSERT WITH CHECK (fn_is_editor(workspace_id));
CREATE POLICY "cats_editor_update" ON categories FOR UPDATE USING (fn_is_editor(workspace_id));
CREATE POLICY "cats_editor_delete" ON categories FOR DELETE USING (fn_is_editor(workspace_id));

-- transactions
CREATE POLICY "tx_member_read" ON transactions FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "tx_editor_insert" ON transactions FOR INSERT WITH CHECK (
  fn_is_editor(workspace_id) AND created_by = auth.uid()
);
CREATE POLICY "tx_editor_update" ON transactions FOR UPDATE USING (fn_is_editor(workspace_id));
CREATE POLICY "tx_editor_delete" ON transactions FOR DELETE USING (fn_is_editor(workspace_id));

-- recurring
CREATE POLICY "rec_member_read" ON recurring FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "rec_editor_insert" ON recurring FOR INSERT WITH CHECK (
  fn_is_editor(workspace_id) AND created_by = auth.uid()
);
CREATE POLICY "rec_editor_update" ON recurring FOR UPDATE USING (fn_is_editor(workspace_id));
CREATE POLICY "rec_editor_delete" ON recurring FOR DELETE USING (fn_is_editor(workspace_id));

-- investments
CREATE POLICY "inv_member_read" ON investments FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "inv_editor_insert" ON investments FOR INSERT WITH CHECK (
  fn_is_editor(workspace_id) AND created_by = auth.uid()
);
CREATE POLICY "inv_editor_update" ON investments FOR UPDATE USING (fn_is_editor(workspace_id));
CREATE POLICY "inv_editor_delete" ON investments FOR DELETE USING (fn_is_editor(workspace_id));

-- debts
CREATE POLICY "debts_member_read" ON debts FOR SELECT USING (fn_is_member(workspace_id));
CREATE POLICY "debts_editor_insert" ON debts FOR INSERT WITH CHECK (
  fn_is_editor(workspace_id) AND created_by = auth.uid()
);
CREATE POLICY "debts_editor_update" ON debts FOR UPDATE USING (fn_is_editor(workspace_id));
CREATE POLICY "debts_editor_delete" ON debts FOR DELETE USING (fn_is_editor(workspace_id));

-- audit_logs: membros lêem; ninguém escreve direto (só via trigger SECURITY DEFINER)
CREATE POLICY "audit_member_read" ON audit_logs FOR SELECT USING (fn_is_member(workspace_id));
