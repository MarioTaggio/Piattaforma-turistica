-- =============================================================================
-- Sistema recensioni cross-modulo
--
-- Una sola tabella per le recensioni di tutti i moduli (eventi, B&B,
-- ristoranti, prodotti shop, corsi video, attrazioni infopoint).
-- Il discriminatore è quale FK opzionale è valorizzata; un CHECK
-- garantisce che SEMPRE una e una sola FK sia non-null.
--
-- Workflow:
--   1. Utente con acquisto/prenotazione approvata inserisce recensione
--      → stato = 'in_attesa', visibile solo all'autore e al gestore.
--   2. Gestore approva → stato = 'approvata', diventa pubblica.
--      Gestore rifiuta → stato = 'rifiutata' (motivazione opzionale).
--   3. Gestore può rispondere pubblicamente (campo risposta_gestore).
-- =============================================================================

create table if not exists public.recensioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- FK opzionali: una sola valorizzata (vincolo sotto).
  evento_id uuid references public.eventi(id) on delete cascade,
  struttura_id uuid references public.strutture(id) on delete cascade,
  ristorante_id uuid references public.ristoranti(id) on delete cascade,
  prodotto_id uuid references public.shop_prodotti(id) on delete cascade,
  corso_id uuid references public.corsi(id) on delete cascade,
  attrazione_id uuid references public.attrazioni(id) on delete cascade,

  voto integer not null check (voto between 1 and 5),
  titolo text not null check (char_length(titolo) between 3 and 120),
  testo text not null check (char_length(testo) between 10 and 2000),

  stato text not null default 'in_attesa'
    check (stato in ('in_attesa', 'approvata', 'rifiutata')),
  motivazione_rifiuto text,

  risposta_gestore text,
  risposta_data timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Esattamente una FK contenuto deve essere valorizzata.
  constraint recensioni_one_target_check check (
    (
      (evento_id is not null)::int
      + (struttura_id is not null)::int
      + (ristorante_id is not null)::int
      + (prodotto_id is not null)::int
      + (corso_id is not null)::int
      + (attrazione_id is not null)::int
    ) = 1
  )
);

-- Una sola recensione per coppia (utente, contenuto). Indici UNIQUE parziali:
-- consentono NULL ripetuti ma vietano (user_id, X_id) duplicati quando X_id
-- è valorizzato.
create unique index if not exists recensioni_user_evento_idx
  on public.recensioni (user_id, evento_id)
  where evento_id is not null;
create unique index if not exists recensioni_user_struttura_idx
  on public.recensioni (user_id, struttura_id)
  where struttura_id is not null;
create unique index if not exists recensioni_user_ristorante_idx
  on public.recensioni (user_id, ristorante_id)
  where ristorante_id is not null;
create unique index if not exists recensioni_user_prodotto_idx
  on public.recensioni (user_id, prodotto_id)
  where prodotto_id is not null;
create unique index if not exists recensioni_user_corso_idx
  on public.recensioni (user_id, corso_id)
  where corso_id is not null;
create unique index if not exists recensioni_user_attrazione_idx
  on public.recensioni (user_id, attrazione_id)
  where attrazione_id is not null;

-- Indici per query pubbliche / dashboard.
create index if not exists recensioni_evento_stato_idx
  on public.recensioni (evento_id, stato) where evento_id is not null;
create index if not exists recensioni_struttura_stato_idx
  on public.recensioni (struttura_id, stato) where struttura_id is not null;
create index if not exists recensioni_ristorante_stato_idx
  on public.recensioni (ristorante_id, stato) where ristorante_id is not null;
create index if not exists recensioni_prodotto_stato_idx
  on public.recensioni (prodotto_id, stato) where prodotto_id is not null;
create index if not exists recensioni_corso_stato_idx
  on public.recensioni (corso_id, stato) where corso_id is not null;
create index if not exists recensioni_attrazione_stato_idx
  on public.recensioni (attrazione_id, stato) where attrazione_id is not null;

create index if not exists recensioni_user_id_idx
  on public.recensioni (user_id);

-- Trigger per updated_at.
create or replace function public.recensioni_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recensioni_updated_at on public.recensioni;
create trigger recensioni_updated_at
  before update on public.recensioni
  for each row execute function public.recensioni_set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.recensioni enable row level security;

-- SELECT pubblico: chiunque vede approvate; autore vede le proprie; gestore
-- del contenuto e admin vedono tutte.
drop policy if exists recensioni_select on public.recensioni;
create policy recensioni_select on public.recensioni
  for select
  using (
    stato = 'approvata'
    or user_id = auth.uid()
    or public.is_admin()
    or auth.uid() in (
      select gestore_id from public.eventi where id = evento_id
      union all select gestore_id from public.strutture where id = struttura_id
      union all select gestore_id from public.ristoranti where id = ristorante_id
      union all select s.gestore_id
        from public.shop_prodotti sp
        join public.shops s on s.id = sp.shop_id
        where sp.id = prodotto_id
      union all select gestore_id from public.corsi where id = corso_id
      union all select gestore_id from public.attrazioni where id = attrazione_id
    )
  );

-- INSERT: l'utente può inserire SOLO recensioni a proprio nome. La verifica
-- di acquisto/prenotazione viene fatta lato server action (più espressiva di
-- una policy RLS).
drop policy if exists recensioni_insert on public.recensioni;
create policy recensioni_insert on public.recensioni
  for insert
  with check (auth.uid() = user_id and stato = 'in_attesa');

-- UPDATE: l'autore può modificare voto/titolo/testo finché è in_attesa;
-- gestore del contenuto + admin possono cambiare stato/risposta/motivazione.
drop policy if exists recensioni_update_author on public.recensioni;
create policy recensioni_update_author on public.recensioni
  for update
  using (auth.uid() = user_id and stato = 'in_attesa')
  with check (auth.uid() = user_id and stato = 'in_attesa');

drop policy if exists recensioni_update_gestore on public.recensioni;
create policy recensioni_update_gestore on public.recensioni
  for update
  using (
    public.is_admin()
    or auth.uid() in (
      select gestore_id from public.eventi where id = evento_id
      union all select gestore_id from public.strutture where id = struttura_id
      union all select gestore_id from public.ristoranti where id = ristorante_id
      union all select s.gestore_id
        from public.shop_prodotti sp
        join public.shops s on s.id = sp.shop_id
        where sp.id = prodotto_id
      union all select gestore_id from public.corsi where id = corso_id
      union all select gestore_id from public.attrazioni where id = attrazione_id
    )
  );

-- DELETE: solo autore (se in_attesa) o admin.
drop policy if exists recensioni_delete on public.recensioni;
create policy recensioni_delete on public.recensioni
  for delete
  using (
    public.is_admin()
    or (auth.uid() = user_id and stato = 'in_attesa')
  );
