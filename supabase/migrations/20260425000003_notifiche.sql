-- =============================================================================
-- Notifiche: in-app notifications with realtime delivery.
-- Run after part 1 + part 2.
-- =============================================================================

drop type if exists notifica_tipo cascade;
create type notifica_tipo as enum ('info', 'successo', 'avviso', 'errore');

create table public.notifiche (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  titolo      text not null,
  messaggio   text,
  tipo        notifica_tipo not null default 'info',
  letta       boolean not null default false,
  link        text,            -- optional in-app URL
  created_at  timestamptz not null default now()
);

create index notifiche_user_idx
  on public.notifiche(user_id, created_at desc);

create index notifiche_user_unread_idx
  on public.notifiche(user_id, created_at desc)
  where letta = false;

alter table public.notifiche enable row level security;

drop policy if exists "notifiche own select" on public.notifiche;
create policy "notifiche own select" on public.notifiche for select
  using (user_id = auth.uid());

drop policy if exists "notifiche own update" on public.notifiche;
create policy "notifiche own update" on public.notifiche for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifiche admin write" on public.notifiche;
create policy "notifiche admin write" on public.notifiche for all
  using (public.is_admin()) with check (public.is_admin());

-- Add to the realtime publication so the client can subscribe to INSERTs.
-- Idempotent: skip if the table is already a member.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifiche'
  ) then
    alter publication supabase_realtime add table public.notifiche;
  end if;
end $$;
