-- =============================================================================
-- Piattaforma Turistica — Shop entity, parte 2: tabelle + RLS.
--
-- Richiede che il valore enum `gestore_shop` sia già stato committato
-- (vedi migration 20260425000006_shop_entity.sql).
--
-- Idempotente. Eseguibile dal Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabelle
-- -----------------------------------------------------------------------------
create table if not exists public.shops (
  id           uuid primary key default gen_random_uuid(),
  gestore_id   uuid not null references public.users(id) on delete restrict,
  nome         text not null,
  descrizione  text,
  citta        text,
  indirizzo    text,
  telefono     text,
  email        citext,
  immagini     text[] not null default '{}',
  stato        stato_pubblicazione not null default 'bozza',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists shops_gestore_idx on public.shops(gestore_id);
create index if not exists shops_stato_idx   on public.shops(stato);

drop trigger if exists shops_set_updated_at on public.shops;
create trigger shops_set_updated_at
  before update on public.shops
  for each row execute function public.set_updated_at();

create table if not exists public.shop_prodotti (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops(id) on delete cascade,
  nome          text not null,
  descrizione   text,
  prezzo_cents  integer not null check (prezzo_cents >= 0),
  categoria     text,
  immagine_url  text,
  disponibile   boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists shop_prodotti_shop_idx on public.shop_prodotti(shop_id);

create table if not exists public.ordini_shop (
  id                       uuid primary key default gen_random_uuid(),
  shop_id                  uuid not null references public.shops(id) on delete restrict,
  utente_id                uuid not null references public.users(id) on delete restrict,
  totale_cents             integer not null check (totale_cents >= 0),
  stato                    stato_ordine not null default 'in_attesa',
  stato_pagamento          stato_pagamento not null default 'in_attesa',
  stripe_payment_intent_id text,
  note                     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists ordini_shop_shop_idx   on public.ordini_shop(shop_id);
create index if not exists ordini_shop_utente_idx on public.ordini_shop(utente_id);
create index if not exists ordini_shop_stato_idx  on public.ordini_shop(stato);

drop trigger if exists ordini_shop_set_updated_at on public.ordini_shop;
create trigger ordini_shop_set_updated_at
  before update on public.ordini_shop
  for each row execute function public.set_updated_at();

create table if not exists public.ordini_shop_prodotti (
  id                    uuid primary key default gen_random_uuid(),
  ordine_id             uuid not null references public.ordini_shop(id) on delete cascade,
  prodotto_id           uuid not null references public.shop_prodotti(id) on delete restrict,
  quantita              smallint not null check (quantita > 0),
  prezzo_unitario_cents integer not null check (prezzo_unitario_cents >= 0)
);
create index if not exists ordini_shop_prodotti_ordine_idx
  on public.ordini_shop_prodotti(ordine_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.shops                 enable row level security;
alter table public.shop_prodotti         enable row level security;
alter table public.ordini_shop           enable row level security;
alter table public.ordini_shop_prodotti  enable row level security;

-- ----- shops -----
drop policy if exists "shops public read pubblicati" on public.shops;
create policy "shops public read pubblicati" on public.shops for select
  using (stato = 'pubblicato' or gestore_id = auth.uid() or public.is_admin());

drop policy if exists "shops gestore insert" on public.shops;
create policy "shops gestore insert" on public.shops for insert
  with check (
    public.is_admin()
    or (gestore_id = auth.uid() and public.has_role('gestore_shop'))
  );

drop policy if exists "shops gestore update" on public.shops;
create policy "shops gestore update" on public.shops for update
  using (gestore_id = auth.uid() or public.is_admin())
  with check (gestore_id = auth.uid() or public.is_admin());

drop policy if exists "shops gestore delete" on public.shops;
create policy "shops gestore delete" on public.shops for delete
  using (gestore_id = auth.uid() or public.is_admin());

-- ----- shop_prodotti -----
drop policy if exists "shop_prodotti public read" on public.shop_prodotti;
create policy "shop_prodotti public read" on public.shop_prodotti for select
  using (
    exists (
      select 1 from public.shops s
      where s.id = shop_prodotti.shop_id
        and (s.stato = 'pubblicato' or s.gestore_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "shop_prodotti gestore write" on public.shop_prodotti;
create policy "shop_prodotti gestore write" on public.shop_prodotti for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.shops s
      where s.id = shop_prodotti.shop_id and s.gestore_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.shops s
      where s.id = shop_prodotti.shop_id and s.gestore_id = auth.uid()
    )
  );

-- ----- ordini_shop -----
drop policy if exists "ordini_shop read" on public.ordini_shop;
create policy "ordini_shop read" on public.ordini_shop for select
  using (
    utente_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.shops s
      where s.id = ordini_shop.shop_id and s.gestore_id = auth.uid()
    )
  );

drop policy if exists "ordini_shop utente insert" on public.ordini_shop;
create policy "ordini_shop utente insert" on public.ordini_shop for insert
  with check (utente_id = auth.uid());

drop policy if exists "ordini_shop gestore update" on public.ordini_shop;
create policy "ordini_shop gestore update" on public.ordini_shop for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.shops s
      where s.id = ordini_shop.shop_id and s.gestore_id = auth.uid()
    )
  );

-- ----- ordini_shop_prodotti -----
drop policy if exists "ordini_shop_prodotti read" on public.ordini_shop_prodotti;
create policy "ordini_shop_prodotti read" on public.ordini_shop_prodotti for select
  using (
    exists (
      select 1 from public.ordini_shop o
      where o.id = ordini_shop_prodotti.ordine_id
        and (
          o.utente_id = auth.uid()
          or public.is_admin()
          or exists (
            select 1 from public.shops s
            where s.id = o.shop_id and s.gestore_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "ordini_shop_prodotti insert" on public.ordini_shop_prodotti;
create policy "ordini_shop_prodotti insert" on public.ordini_shop_prodotti for insert
  with check (
    exists (
      select 1 from public.ordini_shop o
      where o.id = ordini_shop_prodotti.ordine_id and o.utente_id = auth.uid()
    )
  );
