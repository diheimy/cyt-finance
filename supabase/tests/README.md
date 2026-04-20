# Testes SQL (pgTAP — opcional)

Os testes de RLS **principais** rodam em `apps/api/tests/test_rls.py` usando pytest + supabase-py
(cobrem os cenários cross-workspace end-to-end via PostgREST).

Este diretório reserva espaço para testes SQL-first (pgTAP) caso queira auditar policies
diretamente no banco. Não obrigatório para o MVP — adicionar se houver apetite para
validação mais granular por política.

Para rodar os testes pytest:

```bash
supabase start
supabase db reset   # aplica todas as migrations

export SUPABASE_URL=http://localhost:54321
export SUPABASE_ANON_KEY=$(supabase status -o env | awk -F= '/ANON_KEY/{print $2}')
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | awk -F= '/SERVICE_ROLE_KEY/{print $2}')

cd apps/api && pytest tests/test_rls.py -v
```
