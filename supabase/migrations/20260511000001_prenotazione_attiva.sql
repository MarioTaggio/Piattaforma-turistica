-- =============================================================================
-- Prenotazioni opzionali per modulo
--
-- Ogni contenuto pubblicato (evento, struttura B&B, ristorante) ora ha un
-- flag `prenotazione_attiva` che controlla se il sito pubblico mostra il
-- pulsante di acquisto/prenotazione.
--
-- Default: false → un gestore che pubblica un contenuto NON espone il flow
-- di prenotazione finché non lo abilita esplicitamente. Questo evita
-- prenotazioni inattese su contenuti appena migrati / ancora da configurare.
-- =============================================================================

alter table public.eventi
  add column if not exists prenotazione_attiva boolean not null default false;

alter table public.strutture
  add column if not exists prenotazione_attiva boolean not null default false;

alter table public.ristoranti
  add column if not exists prenotazione_attiva boolean not null default false;
