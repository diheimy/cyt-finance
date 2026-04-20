-- ─────────────────────────────────────────────────────────────
-- F1 — RPCs de negócio
-- ─────────────────────────────────────────────────────────────

-- Helpers de membership (usados nas policies e nas funções)
CREATE OR REPLACE FUNCTION fn_is_member(p_ws UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_ws AND user_id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_is_editor(p_ws UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_ws AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_is_owner(p_ws UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_ws AND owner_id = auth.uid()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Aceita convite: adiciona o usuário logado em workspace_members
CREATE OR REPLACE FUNCTION accept_invite(p_token TEXT)
RETURNS workspaces AS $$
DECLARE
  v_invite invites%ROWTYPE;
  v_ws workspaces%ROWTYPE;
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_invite FROM invites
    WHERE token = p_token
      AND accepted_at IS NULL
      AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_invite' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_invite.workspace_id, v_user, 'editor')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE invites SET accepted_at = NOW() WHERE id = v_invite.id;

  SELECT * INTO v_ws FROM workspaces WHERE id = v_invite.workspace_id;
  RETURN v_ws;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria N parcelas de gasto em cartão respeitando dia de fechamento
CREATE OR REPLACE FUNCTION create_installments(
  p_workspace_id UUID,
  p_cartao_id UUID,
  p_valor_total NUMERIC(14,2),
  p_parcelas SMALLINT,
  p_descricao TEXT,
  p_categoria_id UUID,
  p_data_compra DATE
) RETURNS UUID AS $$
DECLARE
  v_compra UUID := gen_random_uuid();
  v_valor_parcela NUMERIC(14,2) := ROUND(p_valor_total / p_parcelas, 2);
  v_ultimo NUMERIC(14,2) := p_valor_total - (v_valor_parcela * (p_parcelas - 1));
  v_dia_fech SMALLINT;
  v_primeira_data DATE;
  i SMALLINT;
BEGIN
  IF NOT fn_is_editor(p_workspace_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT dia_fechamento INTO v_dia_fech FROM cards
    WHERE id = p_cartao_id AND workspace_id = p_workspace_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'card_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF EXTRACT(DAY FROM p_data_compra) <= v_dia_fech THEN
    v_primeira_data := (date_trunc('month', p_data_compra) + INTERVAL '1 month')::DATE;
  ELSE
    v_primeira_data := (date_trunc('month', p_data_compra) + INTERVAL '2 months')::DATE;
  END IF;

  FOR i IN 1..p_parcelas LOOP
    INSERT INTO transactions (
      workspace_id, tipo, valor, descricao, data, categoria_id, cartao_id,
      compra_id, parcela_atual, parcelas_total, paga, created_by
    ) VALUES (
      p_workspace_id, 'gasto',
      CASE WHEN i = p_parcelas THEN v_ultimo ELSE v_valor_parcela END,
      p_descricao,
      (v_primeira_data + make_interval(months => i - 1))::DATE,
      p_categoria_id, p_cartao_id,
      v_compra, i, p_parcelas,
      FALSE,
      auth.uid()
    );
  END LOOP;

  RETURN v_compra;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
