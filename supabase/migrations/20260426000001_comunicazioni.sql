-- =============================================================================
-- Piattaforma Turistica — Comunicazioni gestore → utente.
--
-- Tabella per archiviare le comunicazioni inviate dai gestori (B&B, ristorante,
-- evento, infopoint, shop, video) ai propri utenti. Ogni record ha:
--   - mittente_id     → uuid del gestore (può essere null se admin/sistema)
--   - destinatario_id → uuid dell'utente destinatario
--   - oggetto / testo → contenuto
--   - tipo_mittente   → ruolo del gestore (es. 'gestore_bnb')
--   - entita_nome     → nome leggibile del business (es. "Hotel Bella Vista")
--   - letta           → flag per la pagina utente
--
-- La pagina utente /dashboard/comunicazioni elenca tutte le comunicazioni di
-- destinatario_id = auth.uid(). Il dettaglio segna `letta = true` al primo
-- accesso. Una notifica in-app collegata viene creata in parallelo dall'action
-- server `sendComunicazione`, con link alla pagina di dettaglio.
--
-- Idempotente.
-- =============================================================================

create table if not exists public.comunicazioni (
  id              uuid primary key default gen_random_uuid(),
  mittente_id     uuid references public.users(id) on delete set null,
  destinatario_id uuid not null references public.users(id) on delete cascade,
  oggetto         text not null,
  testo           text not null,
  letta           boolean not null default false,
  tipo_mittente   text,
  entita_nome     text,
  link            text,
  created_at      timestamptz not null default now()
);

create index if not exists comunicazioni_dest_idx
  on public.comunicazioni(destinatario_id, created_at desc);

create index if not exists comunicazioni_dest_unread_idx
  on public.comunicazioni(destinatario_id, created_at desc)
  where letta = false;

create index if not exists comunicazioni_mittente_idx
  on public.comunicazioni(mittente_id, created_at desc);

alter table public.comunicazioni enable row level security;

-- Il destinatario può leggere e segnare letta la propria comunicazione.
drop policy if exists "comunicazioni own select" on public.comunicazioni;
create policy "comunicazioni own select" on public.comunicazioni for select
  using (destinatario_id = auth.uid() or mittente_id = auth.uid() or public.is_admin());

drop policy if exists "comunicazioni own update" on public.comunicazioni;
create policy "comunicazioni own update" on public.comunicazioni for update
  using (destinatario_id = auth.uid())
  with check (destinatario_id = auth.uid());

-- Mittente (gestore) può inserire una comunicazione di cui è il mittente.
drop policy if exists "comunicazioni mittente insert" on public.comunicazioni;
create policy "comunicazioni mittente insert" on public.comunicazioni for insert
  with check (mittente_id = auth.uid() or public.is_admin());

-- Admin full access.
drop policy if exists "comunicazioni admin all" on public.comunicazioni;
create policy "comunicazioni admin all" on public.comunicazioni for all
  using (public.is_admin()) with check (public.is_admin());
