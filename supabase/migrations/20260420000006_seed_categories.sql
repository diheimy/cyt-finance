-- ─────────────────────────────────────────────────────────────
-- F1 — Seed de categorias default ao criar workspace
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (workspace_id, nome, tipo, cor, icone) VALUES
    (NEW.id, 'Alimentação', 'gasto', '#f59e0b', 'utensils'),
    (NEW.id, 'Transporte', 'gasto', '#3b82f6', 'car'),
    (NEW.id, 'Moradia', 'gasto', '#8b5cf6', 'home'),
    (NEW.id, 'Lazer', 'gasto', '#ec4899', 'smile'),
    (NEW.id, 'Saúde', 'gasto', '#ef4444', 'heart'),
    (NEW.id, 'Educação', 'gasto', '#14b8a6', 'book-open'),
    (NEW.id, 'Outros', 'gasto', '#64748b', 'more-horizontal'),
    (NEW.id, 'Salário', 'entrada', '#10b981', 'briefcase'),
    (NEW.id, 'Renda Extra', 'entrada', '#22c55e', 'plus-circle'),
    (NEW.id, 'Renda Fixa', 'investimento', '#0ea5e9', 'trending-up'),
    (NEW.id, 'Renda Variável', 'investimento', '#6366f1', 'activity'),
    (NEW.id, 'Cripto', 'investimento', '#f97316', 'coins'),
    (NEW.id, 'Imóveis', 'investimento', '#84cc16', 'building-2');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_seed_categories
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION fn_seed_default_categories();
