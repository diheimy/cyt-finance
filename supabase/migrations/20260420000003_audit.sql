-- ─────────────────────────────────────────────────────────────
-- F1 — Auditoria (log de toda ação em tabelas de domínio)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_ws_created ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_entidade ON audit_logs(workspace_id, entidade, created_at DESC);

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_ws UUID;
BEGIN
  v_ws := COALESCE(NEW.workspace_id, OLD.workspace_id);
  INSERT INTO audit_logs (workspace_id, user_id, acao, entidade, entidade_id, payload)
  VALUES (
    v_ws,
    auth.uid(),
    LOWER(TG_OP),
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id),
    jsonb_build_object(
      'new', CASE WHEN NEW IS NULL THEN NULL ELSE to_jsonb(NEW) END,
      'old', CASE WHEN OLD IS NULL THEN NULL ELSE to_jsonb(OLD) END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger em todas as tabelas de domínio
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['transactions','cards','categories','recurring','investments','debts']) LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();',
      t, t
    );
  END LOOP;
END;
$$;
