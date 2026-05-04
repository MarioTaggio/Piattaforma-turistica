-- =============================================================================
-- Piattaforma Turistica — Metodo di pagamento per ordini_shop.
--
-- Aggiunge l'enum `metodo_pagamento` e la colonna corrispondente su
-- `ordini_shop`. Supporta:
--   - online      → pagamento immediato via Stripe (carta, Apple Pay,
--                   Google Pay, PayPal, ecc. abilitati dal dashboard Stripe)
--   - alla_consegna → cash on delivery: l'utente paga al corriere
--
-- Idempotente.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'metodo_pagamento') then
    create type public.metodo_pagamento as enum (
      'online',
      'alla_consegna'
    );
  end if;
end $$;

alter table public.ordini_shop
  add column if not exists metodo_pagamento metodo_pagamento not null default 'online';
