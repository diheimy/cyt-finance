-- QA finding: `supabase gen types` marcava p_categoria_id como string não-nullable
-- porque a função não tinha DEFAULT NULL. Em runtime Postgres aceita NULL (provado
-- pelo test_installments.py cenário "sem categoria"), mas o TypeScript gerado
-- refletia assinatura não-nullable, causando erros de type-check no cliente.
--
-- Fix: adicionar DEFAULT NULL explícito em params que são opcionais.

CREATE OR REPLACE FUNCTION create_installments(
  p_workspace_id UUID,
  p_cartao_id UUID,
  p_valor_total NUMERIC(14,2),
  p_parcelas SMALLINT,
  p_descricao TEXT,
  p_data_compra DATE,
  p_categoria_id UUID DEFAULT NULL
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

-- Drop a assinatura antiga (onde p_categoria_id vinha antes de p_data_compra)
-- só se ela existir com o shape exato antigo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_installments'
      AND pronargs = 7
      AND pg_get_function_identity_arguments(oid)
        = 'p_workspace_id uuid, p_cartao_id uuid, p_valor_total numeric, p_parcelas smallint, p_descricao text, p_categoria_id uuid, p_data_compra date'
  ) THEN
    DROP FUNCTION create_installments(UUID, UUID, NUMERIC, SMALLINT, TEXT, UUID, DATE);
  END IF;
END $$;
