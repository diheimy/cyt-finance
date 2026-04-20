-- Fix: audit_logs.user_id NOT NULL quebra operações feitas como postgres/superuser
-- sem JWT (ex: DELETE manual de manutenção, cron jobs, migrations que mexem em
-- tabelas com trigger de audit). auth.uid() retorna NULL nesses casos.
--
-- Em uso normal (user authenticated) nunca é NULL. Mas operações administrativas
-- travam o audit trigger com constraint violation.
--
-- Fix: tornar user_id nullable. Consultas de auditoria filtram por "sistema" quando null.

ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;
