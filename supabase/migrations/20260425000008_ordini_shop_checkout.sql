-- =============================================================================
-- Piattaforma Turistica — Checkout fields per ordini_shop.
--
-- Aggiunge:
--   - dati di consegna (nome, cognome, indirizzo, citta, cap, provincia,
--     telefono, email)
--   - dati di fatturazione (uguali alla consegna oppure separati con P.IVA)
--   - metodo di spedizione (standard / express / ritiro) + costo
--   - costo IVA
--
-- Idempotente.
-- =============================================================================

-- ----- Spedizione enum -----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'metodo_spedizione') then
    create type public.metodo_spedizione as enum (
      'standard',
      'express',
      'ritiro'
    );
  end if;
end $$;

alter table public.ordini_shop
  add column if not exists shipping_nome        text,
  add column if not exists shipping_cognome     text,
  add column if not exists shipping_indirizzo   text,
  add column if not exists shipping_citta       text,
  add column if not exists shipping_cap         text,
  add column if not exists shipping_provincia   text,
  add column if not exists shipping_telefono    text,
  add column if not exists shipping_email       text,
  add column if not exists billing_uguale       boolean not null default true,
  add column if not exists billing_nome         text,
  add column if not exists billing_cognome      text,
  add column if not exists billing_indirizzo    text,
  add column if not exists billing_citta        text,
  add column if not exists billing_cap          text,
  add column if not exists billing_provincia    text,
  add column if not exists billing_partita_iva  text,
  add column if not exists billing_codice_fiscale text,
  add column if not exists metodo_spedizione    metodo_spedizione not null default 'standard',
  add column if not exists costo_spedizione_cents integer not null default 0 check (costo_spedizione_cents >= 0),
  add column if not exists iva_cents            integer not null default 0 check (iva_cents >= 0),
  add column if not exists tracking_codice      text,
  add column if not exists tracking_url         text;
