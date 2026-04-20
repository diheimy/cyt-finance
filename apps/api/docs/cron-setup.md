# Configuração do Cron Recurring

O job de materialização precisa disparar `POST /recurring/tick` uma vez por dia.
Três opções em ordem de simplicidade:

## Opção 1 — GitHub Actions (recomendada para MVP)

`.github/workflows/cron-recurring.yml`:

```yaml
name: Cron Recurring Tick
on:
  schedule:
    - cron: "0 9 * * *"   # 06:00 BRT (09:00 UTC) diariamente
  workflow_dispatch:

jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - name: Call tick endpoint
        env:
          API_URL: ${{ vars.API_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
        run: |
          curl -sS -X POST \
            -H "X-Cron-Secret: $CRON_SECRET" \
            -w "\nHTTP %{http_code}\n" \
            "$API_URL/recurring/tick" \
            | tee /dev/stderr
```

**Prós:** grátis, confiável, histórico de execuções, zero infra adicional.
**Cons:** latência de startup do runner (~10s irrelevante aqui).

## Opção 2 — Supabase pg_cron

Se preferir disparar do próprio banco (evita depender de GitHub):

```sql
SELECT cron.schedule(
  'cyt-recurring-tick',
  '0 9 * * *',
  $$SELECT net.http_post(
    url := 'https://cyt-finance-api.fly.dev/recurring/tick',
    headers := jsonb_build_object('X-Cron-Secret', current_setting('app.cron_secret'))
  );$$
);
```

Requer extensão `pg_net` habilitada no projeto Supabase e setar
`app.cron_secret` via `ALTER DATABASE … SET app.cron_secret = '...'`.

## Opção 3 — Fly.io machine dedicada

O `fly.toml` do projeto já define um processo `recurring-cron` com loop shell.
Menos robusto que GitHub Actions para timing; serve como fallback.

## Variáveis necessárias

| Ambiente | Variável | Valor |
|---|---|---|
| API | `CRON_SECRET` | string aleatória (≥32 chars). `openssl rand -hex 32` |
| Cron runner | `CRON_SECRET` | mesmo valor acima |
| API | `SUPABASE_URL` | URL do projeto |
| API | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role (secret) |

## Como testar localmente

```bash
export CRON_SECRET=test-secret
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | awk -F= '/SERVICE_ROLE_KEY/{print $2}' | tr -d '"')

cd apps/api
uvicorn src.main:app --reload &

curl -X POST -H "X-Cron-Secret: test-secret" http://localhost:8000/recurring/tick
# { "materialized_count": N, "skipped_count": M, "errors": [], "ran_at": "2026-04-20" }
```

A segunda chamada no mesmo dia retorna `materialized_count: 0` (idempotência).
