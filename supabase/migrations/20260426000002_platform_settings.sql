-- =============================================================================
-- Piattaforma Turistica — platform_settings
--
-- Singola riga (id = 1) che contiene tutte le impostazioni di piattaforma:
-- branding, moduli attivi, commissioni, email, manutenzione.
--
-- Pattern "singleton table": id check = 1 garantisce un'unica riga. Le
-- impostazioni live in colonne piatte per facilitare il lookup; toggle moduli
-- e commissioni sono in JSONB per estendibilità.
--
-- Idempotente.
-- =============================================================================

create table if not exists public.platform_settings (
  id              integer primary key default 1 check (id = 1),
  -- Branding
  site_nome       text not null default 'Piattaforma Turistica',
  site_descrizione text,
  site_logo_url   text,
  site_color_primario text default '#1B4332',

  -- Moduli attivi (JSON con flag per ogni modulo)
  moduli_attivi   jsonb not null default '{
    "eventi": true,
    "bnb": true,
    "ristoranti": true,
    "shop": true,
    "video": true,
    "infopoint": true,
    "virtual_tour": true
  }'::jsonb,

  -- Commissioni (% per modulo)
  commissioni     jsonb not null default '{
    "eventi": 5,
    "bnb": 8,
    "ristoranti": 0,
    "shop": 7,
    "video": 15,
    "infopoint": 5
  }'::jsonb,

  -- Email config
  email_mittente_nome  text default 'Piattaforma Turistica',
  email_mittente_email text,
  email_oggetto_default text default '',

  -- Manutenzione
  manutenzione_attiva  boolean not null default false,
  manutenzione_messaggio text default 'Stiamo facendo manutenzione, torniamo a breve.',

  updated_at      timestamptz not null default now()
);

-- Garantisce esistenza della singola riga.
insert into public.platform_settings (id) values (1)
on conflict (id) do nothing;

create or replace function public.platform_settings_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists platform_settings_updated_at on public.platform_settings;
create trigger platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.platform_settings_set_updated_at();

alter table public.platform_settings enable row level security;

-- Lettura: tutti (anche utenti non autenticati per branding pubblico)
drop policy if exists "platform_settings public read" on public.platform_settings;
create policy "platform_settings public read" on public.platform_settings for select
  using (true);

-- Scrittura: solo admin
drop policy if exists "platform_settings admin write" on public.platform_settings;
create policy "platform_settings admin write" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());
