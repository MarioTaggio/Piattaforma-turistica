-- =============================================================================
-- Piattaforma Turistica — PART 1: schema (extensions, enums, tables, indexes,
-- triggers).
--
-- Run this BEFORE part 2.
-- Idempotent on enums (handles a half-applied previous run).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions (idempotent)
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- -----------------------------------------------------------------------------
-- Enums — drop first so a re-run of part 1 succeeds.
-- CASCADE is safe here: if any tables already reference these enums they'll
-- be dropped too, but on a clean DB this is a no-op.
-- -----------------------------------------------------------------------------
drop type if exists app_role             cascade;
drop type if exists stato_pubblicazione  cascade;
drop type if exists stato_pagamento      cascade;
drop type if exists stato_biglietto      cascade;
drop type if exists stato_prenotazione   cascade;
drop type if exists stato_ordine         cascade;
drop type if exists tipo_ordine          cascade;
drop type if exists livello_corso        cascade;

create type app_role as enum (
  'admin',
  'utente',
  'gestore_eventi',
  'gestore_bnb',
  'gestore_ristorante',
  'gestore_video',
  'gestore_infopoint'
);

create type stato_pubblicazione as enum ('bozza', 'pubblicato', 'archiviato');

create type stato_pagamento as enum (
  'in_attesa', 'pagato', 'fallito', 'rimborsato'
);

create type stato_biglietto as enum (
  'valido', 'utilizzato', 'rimborsato', 'annullato'
);

create type stato_prenotazione as enum (
  'in_attesa', 'confermata', 'cancellata', 'completata', 'no_show'
);

create type stato_ordine as enum (
  'in_attesa', 'in_preparazione', 'pronto', 'consegnato', 'annullato'
);

create type tipo_ordine as enum ('asporto', 'consegna', 'al_tavolo');

create type livello_corso as enum ('principiante', 'intermedio', 'avanzato');

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger (defined first so all tables can use it)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- USERS / ROLES
-- =============================================================================
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        citext not null unique,
  nome         text,
  cognome      text,
  telefono     text,
  avatar_url   text,
  stripe_customer_id text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id     uuid not null references public.users(id) on delete cascade,
  role        app_role not null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles(role);

-- handle_new_user is plpgsql, so the body is parsed lazily — safe to reference
-- public.user_roles here even though the function is defined in part 1.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, nome, cognome)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'cognome'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'utente')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- EVENTI
-- =============================================================================
create table public.eventi (
  id                uuid primary key default gen_random_uuid(),
  gestore_id        uuid not null references public.users(id) on delete restrict,
  titolo            text not null,
  descrizione       text,
  data_inizio       timestamptz not null,
  data_fine         timestamptz not null,
  luogo             text not null,
  citta             text,
  prezzo_cents      integer not null default 0 check (prezzo_cents >= 0),
  posti_totali      integer not null check (posti_totali > 0),
  posti_disponibili integer not null check (posti_disponibili >= 0),
  immagine_url      text,
  stato             stato_pubblicazione not null default 'bozza',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (data_fine >= data_inizio),
  check (posti_disponibili <= posti_totali)
);
create index eventi_gestore_idx     on public.eventi(gestore_id);
create index eventi_stato_idx       on public.eventi(stato);
create index eventi_data_inizio_idx on public.eventi(data_inizio);
create trigger eventi_set_updated_at
  before update on public.eventi
  for each row execute function public.set_updated_at();

create table public.biglietti (
  id                       uuid primary key default gen_random_uuid(),
  evento_id                uuid not null references public.eventi(id) on delete restrict,
  utente_id                uuid not null references public.users(id) on delete restrict,
  codice                   uuid not null unique default gen_random_uuid(),
  stato                    stato_biglietto not null default 'valido',
  prezzo_pagato_cents      integer not null check (prezzo_pagato_cents >= 0),
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now(),
  utilizzato_at            timestamptz
);
create index biglietti_evento_idx on public.biglietti(evento_id);
create index biglietti_utente_idx on public.biglietti(utente_id);

-- =============================================================================
-- B&B / STRUTTURE
-- =============================================================================
create table public.strutture (
  id           uuid primary key default gen_random_uuid(),
  gestore_id   uuid not null references public.users(id) on delete restrict,
  nome         text not null,
  descrizione  text,
  indirizzo    text not null,
  citta        text not null,
  cap          text,
  latitudine   numeric(9,6),
  longitudine  numeric(9,6),
  stelle       smallint check (stelle between 1 and 5),
  servizi      text[] not null default '{}',
  immagini     text[] not null default '{}',
  stato        stato_pubblicazione not null default 'bozza',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index strutture_gestore_idx on public.strutture(gestore_id);
create index strutture_citta_idx   on public.strutture(citta);
create index strutture_stato_idx   on public.strutture(stato);
create trigger strutture_set_updated_at
  before update on public.strutture
  for each row execute function public.set_updated_at();

create table public.camere (
  id                 uuid primary key default gen_random_uuid(),
  struttura_id       uuid not null references public.strutture(id) on delete cascade,
  nome               text not null,
  descrizione        text,
  capacita           smallint not null check (capacita > 0),
  prezzo_notte_cents integer not null check (prezzo_notte_cents >= 0),
  immagini           text[] not null default '{}',
  disponibile        boolean not null default true,
  created_at         timestamptz not null default now()
);
create index camere_struttura_idx on public.camere(struttura_id);

create table public.prenotazioni_bnb (
  id                       uuid primary key default gen_random_uuid(),
  camera_id                uuid not null references public.camere(id) on delete restrict,
  utente_id                uuid not null references public.users(id) on delete restrict,
  data_check_in            date not null,
  data_check_out           date not null,
  num_ospiti               smallint not null check (num_ospiti > 0),
  prezzo_totale_cents      integer not null check (prezzo_totale_cents >= 0),
  stato                    stato_prenotazione not null default 'in_attesa',
  stato_pagamento          stato_pagamento not null default 'in_attesa',
  stripe_payment_intent_id text,
  note                     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (data_check_out > data_check_in)
);
create index prenotazioni_bnb_camera_idx on public.prenotazioni_bnb(camera_id);
create index prenotazioni_bnb_utente_idx on public.prenotazioni_bnb(utente_id);
create index prenotazioni_bnb_dates_idx  on public.prenotazioni_bnb(data_check_in, data_check_out);
create trigger prenotazioni_bnb_set_updated_at
  before update on public.prenotazioni_bnb
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RISTORANTI
-- =============================================================================
create table public.ristoranti (
  id           uuid primary key default gen_random_uuid(),
  gestore_id   uuid not null references public.users(id) on delete restrict,
  nome         text not null,
  descrizione  text,
  indirizzo    text not null,
  citta        text not null,
  telefono     text,
  email        citext,
  tipo_cucina  text,
  orari        jsonb not null default '{}'::jsonb,
  immagini     text[] not null default '{}',
  stato        stato_pubblicazione not null default 'bozza',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index ristoranti_gestore_idx on public.ristoranti(gestore_id);
create index ristoranti_citta_idx   on public.ristoranti(citta);
create index ristoranti_stato_idx   on public.ristoranti(stato);
create trigger ristoranti_set_updated_at
  before update on public.ristoranti
  for each row execute function public.set_updated_at();

create table public.tavoli (
  id            uuid primary key default gen_random_uuid(),
  ristorante_id uuid not null references public.ristoranti(id) on delete cascade,
  numero        text not null,
  posti         smallint not null check (posti > 0),
  posizione     text,
  attivo        boolean not null default true,
  unique (ristorante_id, numero)
);
create index tavoli_ristorante_idx on public.tavoli(ristorante_id);

create table public.prenotazioni_tavolo (
  id         uuid primary key default gen_random_uuid(),
  tavolo_id  uuid not null references public.tavoli(id) on delete restrict,
  utente_id  uuid not null references public.users(id) on delete restrict,
  data_ora   timestamptz not null,
  num_ospiti smallint not null check (num_ospiti > 0),
  note       text,
  stato      stato_prenotazione not null default 'in_attesa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prenotazioni_tavolo_tavolo_idx on public.prenotazioni_tavolo(tavolo_id);
create index prenotazioni_tavolo_utente_idx on public.prenotazioni_tavolo(utente_id);
create index prenotazioni_tavolo_data_idx   on public.prenotazioni_tavolo(data_ora);
create trigger prenotazioni_tavolo_set_updated_at
  before update on public.prenotazioni_tavolo
  for each row execute function public.set_updated_at();

create table public.prodotti (
  id            uuid primary key default gen_random_uuid(),
  ristorante_id uuid not null references public.ristoranti(id) on delete cascade,
  nome          text not null,
  descrizione   text,
  prezzo_cents  integer not null check (prezzo_cents >= 0),
  categoria     text,
  immagine_url  text,
  disponibile   boolean not null default true,
  created_at    timestamptz not null default now()
);
create index prodotti_ristorante_idx on public.prodotti(ristorante_id);

create table public.ordini (
  id                       uuid primary key default gen_random_uuid(),
  ristorante_id            uuid not null references public.ristoranti(id) on delete restrict,
  utente_id                uuid not null references public.users(id) on delete restrict,
  tavolo_id                uuid references public.tavoli(id) on delete set null,
  totale_cents             integer not null check (totale_cents >= 0),
  tipo                     tipo_ordine not null,
  stato                    stato_ordine not null default 'in_attesa',
  stato_pagamento          stato_pagamento not null default 'in_attesa',
  stripe_payment_intent_id text,
  note                     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index ordini_ristorante_idx on public.ordini(ristorante_id);
create index ordini_utente_idx     on public.ordini(utente_id);
create index ordini_stato_idx      on public.ordini(stato);
create trigger ordini_set_updated_at
  before update on public.ordini
  for each row execute function public.set_updated_at();

create table public.ordini_prodotti (
  id                    uuid primary key default gen_random_uuid(),
  ordine_id             uuid not null references public.ordini(id) on delete cascade,
  prodotto_id           uuid not null references public.prodotti(id) on delete restrict,
  quantita              smallint not null check (quantita > 0),
  prezzo_unitario_cents integer not null check (prezzo_unitario_cents >= 0)
);
create index ordini_prodotti_ordine_idx   on public.ordini_prodotti(ordine_id);
create index ordini_prodotti_prodotto_idx on public.ordini_prodotti(prodotto_id);

-- =============================================================================
-- VIDEO / CORSI
-- =============================================================================
create table public.corsi (
  id                    uuid primary key default gen_random_uuid(),
  gestore_id            uuid not null references public.users(id) on delete restrict,
  titolo                text not null,
  descrizione           text,
  prezzo_cents          integer not null default 0 check (prezzo_cents >= 0),
  immagine_copertina    text,
  livello               livello_corso,
  durata_totale_secondi integer check (durata_totale_secondi >= 0),
  stato                 stato_pubblicazione not null default 'bozza',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index corsi_gestore_idx on public.corsi(gestore_id);
create index corsi_stato_idx   on public.corsi(stato);
create trigger corsi_set_updated_at
  before update on public.corsi
  for each row execute function public.set_updated_at();

create table public.video_lezioni (
  id                 uuid primary key default gen_random_uuid(),
  corso_id           uuid not null references public.corsi(id) on delete cascade,
  titolo             text not null,
  descrizione        text,
  video_url          text not null,
  durata_secondi     integer not null check (durata_secondi >= 0),
  ordine             integer not null,
  anteprima_gratuita boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (corso_id, ordine)
);
create index video_lezioni_corso_idx on public.video_lezioni(corso_id);

create table public.acquisti_video (
  id                       uuid primary key default gen_random_uuid(),
  corso_id                 uuid not null references public.corsi(id) on delete restrict,
  utente_id                uuid not null references public.users(id) on delete restrict,
  prezzo_pagato_cents      integer not null check (prezzo_pagato_cents >= 0),
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now(),
  unique (corso_id, utente_id)
);
create index acquisti_video_utente_idx on public.acquisti_video(utente_id);

-- =============================================================================
-- INFOPOINT / ATTRAZIONI
-- =============================================================================
create table public.attrazioni (
  id           uuid primary key default gen_random_uuid(),
  gestore_id   uuid not null references public.users(id) on delete restrict,
  nome         text not null,
  descrizione  text,
  indirizzo    text not null,
  citta        text not null,
  latitudine   numeric(9,6),
  longitudine  numeric(9,6),
  categoria    text,
  orari        jsonb not null default '{}'::jsonb,
  immagini     text[] not null default '{}',
  stato        stato_pubblicazione not null default 'bozza',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index attrazioni_gestore_idx on public.attrazioni(gestore_id);
create index attrazioni_citta_idx   on public.attrazioni(citta);
create index attrazioni_stato_idx   on public.attrazioni(stato);
create trigger attrazioni_set_updated_at
  before update on public.attrazioni
  for each row execute function public.set_updated_at();

create table public.visite_guidate (
  id                uuid primary key default gen_random_uuid(),
  attrazione_id     uuid not null references public.attrazioni(id) on delete cascade,
  gestore_id        uuid not null references public.users(id) on delete restrict,
  titolo            text not null,
  descrizione       text,
  data_ora          timestamptz not null,
  durata_minuti     integer not null check (durata_minuti > 0),
  posti_totali      integer not null check (posti_totali > 0),
  posti_disponibili integer not null check (posti_disponibili >= 0),
  prezzo_cents      integer not null default 0 check (prezzo_cents >= 0),
  lingua            text not null default 'it',
  stato             stato_pubblicazione not null default 'bozza',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (posti_disponibili <= posti_totali)
);
create index visite_guidate_attrazione_idx on public.visite_guidate(attrazione_id);
create index visite_guidate_gestore_idx    on public.visite_guidate(gestore_id);
create index visite_guidate_data_idx       on public.visite_guidate(data_ora);
create trigger visite_guidate_set_updated_at
  before update on public.visite_guidate
  for each row execute function public.set_updated_at();

create table public.prenotazioni_visita (
  id                       uuid primary key default gen_random_uuid(),
  visita_id                uuid not null references public.visite_guidate(id) on delete restrict,
  utente_id                uuid not null references public.users(id) on delete restrict,
  num_partecipanti         smallint not null check (num_partecipanti > 0),
  prezzo_totale_cents      integer not null check (prezzo_totale_cents >= 0),
  stato                    stato_prenotazione not null default 'in_attesa',
  stato_pagamento          stato_pagamento not null default 'in_attesa',
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index prenotazioni_visita_visita_idx on public.prenotazioni_visita(visita_id);
create index prenotazioni_visita_utente_idx on public.prenotazioni_visita(utente_id);
create trigger prenotazioni_visita_set_updated_at
  before update on public.prenotazioni_visita
  for each row execute function public.set_updated_at();

create table public.tour_virtuali (
  id            uuid primary key default gen_random_uuid(),
  attrazione_id uuid not null references public.attrazioni(id) on delete cascade,
  titolo        text not null,
  descrizione   text,
  prezzo_cents  integer not null default 0 check (prezzo_cents >= 0),
  url_tour      text not null,
  gratuito      boolean not null default false,
  stato         stato_pubblicazione not null default 'bozza',
  created_at    timestamptz not null default now()
);
create index tour_virtuali_attrazione_idx on public.tour_virtuali(attrazione_id);

create table public.accessi_tour (
  id                       uuid primary key default gen_random_uuid(),
  tour_id                  uuid not null references public.tour_virtuali(id) on delete restrict,
  utente_id                uuid not null references public.users(id) on delete restrict,
  data_accesso             timestamptz not null default now(),
  prezzo_pagato_cents      integer not null check (prezzo_pagato_cents >= 0),
  stripe_payment_intent_id text
);
create index accessi_tour_tour_idx   on public.accessi_tour(tour_id);
create index accessi_tour_utente_idx on public.accessi_tour(utente_id);
