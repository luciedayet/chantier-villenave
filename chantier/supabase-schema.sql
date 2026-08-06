-- Créer la table tasks dans Supabase
create table if not exists public.tasks (
  id         bigserial primary key,
  app        text not null,
  room       text not null,
  cat        text not null,
  label      text not null,
  blocked_by_ids integer[] default '{}',
  assignees  text[] default '{}',
  purchases  jsonb default '[]',
  done       boolean default false,
  created_at timestamptz default now()
);

-- Activer RLS (Row Level Security)
alter table public.tasks enable row level security;

-- Policy : tout le monde peut lire/écrire (accès protégé par le cookie côté Next.js)
create policy "Allow all" on public.tasks
  for all using (true) with check (true);
