# Migrations

Migrations são aplicadas em ordem alfabética. Convenção: `YYYYMMDDHHMMSS_descricao.sql`.

## Ordem planejada (F1)

| Ordem | Arquivo | Propósito |
|---|---|---|
| 1 | `20260420000001_identity.sql` | profiles, workspaces, members, invites |
| 2 | `20260420000002_domain.sql` | cards, categories, transactions, recurring, investments, debts |
| 3 | `20260420000003_audit.sql` | audit_logs + triggers |
| 4 | `20260420000004_functions.sql` | accept_invite, create_installments |
| 5 | `20260420000005_rls_policies.sql` | Todas as policies RLS |
| 6 | `20260420000006_seed_categories.sql` | Trigger de seed ao criar workspace |

Detalhes completos em `.claude/sdd/features/DESIGN_CYT_FINANCE_V2.md` §3.
