-- =============================================================================
-- Profilo utente esteso + onboarding + biglietti intestatario +
-- video progressi/note + bucket avatars
-- =============================================================================

-- ----- USERS -----
alter table public.users add column if not exists username text;
alter table public.users add column if not exists data_nascita date;
alter table public.users add column if not exists interessi text[];
alter table public.users add column if not exists citta_preferita text;
alter table public.users add column if not exists newsletter boolean not null default false;
alter table public.users add column if not exists onboarding_completato boolean not null default false;

-- Validazione username (lettere, numeri, underscore, 3-20).
alter table public.users drop constraint if exists users_username_format_check;
alter table public.users add constraint users_username_format_check
  check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');

create unique index if not exists users_username_idx on public.users(lower(username));

-- ----- BIGLIETTI: intestatario -----
alter table public.biglietti add column if not exists intestatario_nome text;
alter table public.biglietti add column if not exists intestatario_cognome text;
alter table public.biglietti add column if not exists intestatario_email text;
alter table public.biglietti add column if not exists intestatario_telefono text;

-- ----- NOTE LEZIONI -----
create table if not exists public.note_lezioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lezione_id uuid not null references public.video_lezioni(id) on delete cascade,
  contenuto text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, lezione_id)
);

create index if not exists note_lezioni_user_idx
  on public.note_lezioni(user_id, lezione_id);

alter table public.note_lezioni enable row level security;

drop policy if exists note_lezioni_select on public.note_lezioni;
create policy note_lezioni_select on public.note_lezioni
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists note_lezioni_insert on public.note_lezioni;
create policy note_lezioni_insert on public.note_lezioni
  for insert with check (user_id = auth.uid());

drop policy if exists note_lezioni_update on public.note_lezioni;
create policy note_lezioni_update on public.note_lezioni
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists note_lezioni_delete on public.note_lezioni;
create policy note_lezioni_delete on public.note_lezioni
  for delete using (user_id = auth.uid() or public.is_admin());

-- ----- VIDEO PROGRESSI -----
create table if not exists public.video_progressi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lezione_id uuid not null references public.video_lezioni(id) on delete cascade,
  secondi_visti integer not null default 0 check (secondi_visti >= 0),
  completata boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, lezione_id)
);

create index if not exists video_progressi_user_idx
  on public.video_progressi(user_id, lezione_id);

alter table public.video_progressi enable row level security;

drop policy if exists video_progressi_select on public.video_progressi;
create policy video_progressi_select on public.video_progressi
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists video_progressi_insert on public.video_progressi;
create policy video_progressi_insert on public.video_progressi
  for insert with check (user_id = auth.uid());

drop policy if exists video_progressi_update on public.video_progressi;
create policy video_progressi_update on public.video_progressi
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----- BUCKET AVATARS -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2 * 1024 * 1024,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "auth write avatars own folder" on storage.objects;
create policy "auth write avatars own folder" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth update avatars own folder" on storage.objects;
create policy "auth update avatars own folder" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth delete avatars own folder" on storage.objects;
create policy "auth delete avatars own folder" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
