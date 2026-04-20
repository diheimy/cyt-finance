-- Fix: RETURNING após INSERT em workspaces falhava porque a policy
-- ws_member_read exige `fn_is_member(id)`, mas o trigger trg_add_owner_as_member
-- (AFTER INSERT) ainda não materializou a membership quando RETURNING é avaliado.
--
-- Solução: permitir o owner ler seu próprio workspace mesmo antes da membership
-- ser registrada em workspace_members. Semanticamente: owner é sempre membro.

DROP POLICY IF EXISTS "ws_member_read" ON public.workspaces;
CREATE POLICY "ws_member_read" ON public.workspaces FOR SELECT
  USING (fn_is_member(id) OR owner_id = auth.uid());
