-- Saúde financeira: base de conhecimento (RAG via pgvector) + relatórios cacheados.

create extension if not exists vector;

-- Base de regras/educação financeira (conteúdo genérico, não sensível).
create table if not exists public.health_kb (
  id uuid primary key default gen_random_uuid(),
  conteudo text not null,
  tags text[] not null default '{}',
  embedding vector(384),
  created_at timestamptz not null default now()
);

alter table public.health_kb enable row level security;

drop policy if exists health_kb_read on public.health_kb;
create policy health_kb_read on public.health_kb
  for select to authenticated using (true);

-- Relatórios de saúde financeira gerados pelo agente, cacheados por workspace/mês.
create table if not exists public.health_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  mes text not null,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  unique (workspace_id, mes)
);

alter table public.health_reports enable row level security;

drop policy if exists health_reports_member on public.health_reports;
create policy health_reports_member on public.health_reports
  for select to authenticated using (fn_is_member(workspace_id));

-- Busca por similaridade na base de conhecimento (cosine distance).
create or replace function public.match_health_kb(query_embedding vector(384), match_count int)
returns table (id uuid, conteudo text, similarity float)
language sql stable as $$
  select id, conteudo, 1 - (embedding <=> query_embedding) as similarity
  from public.health_kb
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
