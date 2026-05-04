-- =============================================================================
-- Piattaforma Turistica — PART 2: helper functions + RLS policies.
--
-- Run this AFTER part 1 (tables must exist).
-- Idempotent: every policy is dropped before being re-created, and functions
-- use CREATE OR REPLACE.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (security definer — read user_roles bypassing the caller's
-- RLS to avoid recursion when policies call has_role()).
-- -----------------------------------------------------------------------------
create or replace function public.has_role(_role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin');
$$;

-- =============================================================================
-- Enable RLS (idempotent — no-op if already enabled)
-- =============================================================================
alter table public.users               enable row level security;
alter table public.user_roles          enable row level security;
alter table public.eventi              enable row level security;
alter table public.biglietti           enable row level security;
alter table public.strutture           enable row level security;
alter table public.camere              enable row level security;
alter table public.prenotazioni_bnb    enable row level security;
alter table public.ristoranti          enable row level security;
alter table public.tavoli              enable row level security;
alter table public.prenotazioni_tavolo enable row level security;
alter table public.prodotti            enable row level security;
alter table public.ordini              enable row level security;
alter table public.ordini_prodotti     enable row level security;
alter table public.corsi               enable row level security;
alter table public.video_lezioni       enable row level security;
alter table public.acquisti_video      enable row level security;
alter table public.attrazioni          enable row level security;
alter table public.visite_guidate      enable row level security;
alter table public.prenotazioni_visita enable row level security;
alter table public.tour_virtuali       enable row level security;
alter table public.accessi_tour        enable row level security;

-- =============================================================================
-- POLICIES
-- Each policy is dropped first so this file can be re-run safely.
-- =============================================================================

-- ----- users -----
drop policy if exists "users self select" on public.users;
create policy "users self select" on public.users for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "users self update" on public.users;
create policy "users self update" on public.users for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "users admin all" on public.users;
create policy "users admin all" on public.users for all
  using (public.is_admin()) with check (public.is_admin());

-- ----- user_roles -----
drop policy if exists "user_roles self select" on public.user_roles;
create policy "user_roles self select" on public.user_roles for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_roles admin write" on public.user_roles;
create policy "user_roles admin write" on public.user_roles for all
  using (public.is_admin()) with check (public.is_admin());

-- ----- eventi -----
drop policy if exists "eventi public read pubblicati" on public.eventi;
create policy "eventi public read pubblicati" on public.eventi for select
  using (stato = 'pubblicato' or gestore_id = auth.uid() or public.is_admin());

drop policy if exists "eventi gestore insert" on public.eventi;
create policy "eventi gestore insert" on public.eventi for insert
  with check (gestore_id = auth.uid() and public.has_role('gestore_eventi'));

drop policy if exists "eventi gestore update" on public.eventi;
create policy "eventi gestore update" on public.eventi for update
  using (gestore_id = auth.uid() or public.is_admin())
  with check (gestore_id = auth.uid() or public.is_admin());

drop policy if exists "eventi gestore delete" on public.eventi;
create policy "eventi gestore delete" on public.eventi for delete
  using (gestore_id = auth.uid() or public.is_admin());

-- ----- biglietti -----
drop policy if exists "biglietti utente read" on public.biglietti;
create policy "biglietti utente read" on public.biglietti for select
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.eventi e
               where e.id = biglietti.evento_id and e.gestore_id = auth.uid()));

drop policy if exists "biglietti utente insert" on public.biglietti;
create policy "biglietti utente insert" on public.biglietti for insert
  with check (utente_id = auth.uid());

drop policy if exists "biglietti gestore update" on public.biglietti;
create policy "biglietti gestore update" on public.biglietti for update
  using (public.is_admin()
    or exists (select 1 from public.eventi e
               where e.id = biglietti.evento_id and e.gestore_id = auth.uid()));

-- ----- strutture -----
drop policy if exists "strutture public read pubblicati" on public.strutture;
create policy "strutture public read pubblicati" on public.strutture for select
  using (stato = 'pubblicato' or gestore_id = auth.uid() or public.is_admin());

drop policy if exists "strutture gestore insert" on public.strutture;
create policy "strutture gestore insert" on public.strutture for insert
  with check (gestore_id = auth.uid() and public.has_role('gestore_bnb'));

drop policy if exists "strutture gestore update" on public.strutture;
create policy "strutture gestore update" on public.strutture for update
  using (gestore_id = auth.uid() or public.is_admin())
  with check (gestore_id = auth.uid() or public.is_admin());

drop policy if exists "strutture gestore delete" on public.strutture;
create policy "strutture gestore delete" on public.strutture for delete
  using (gestore_id = auth.uid() or public.is_admin());

-- ----- camere -----
drop policy if exists "camere public read" on public.camere;
create policy "camere public read" on public.camere for select
  using (exists (select 1 from public.strutture s
                 where s.id = camere.struttura_id
                   and (s.stato = 'pubblicato' or s.gestore_id = auth.uid() or public.is_admin())));

drop policy if exists "camere gestore write" on public.camere;
create policy "camere gestore write" on public.camere for all
  using (public.is_admin()
    or exists (select 1 from public.strutture s
               where s.id = camere.struttura_id and s.gestore_id = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.strutture s
               where s.id = camere.struttura_id and s.gestore_id = auth.uid()));

-- ----- prenotazioni_bnb -----
drop policy if exists "prenotazioni_bnb read" on public.prenotazioni_bnb;
create policy "prenotazioni_bnb read" on public.prenotazioni_bnb for select
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.camere c
               join public.strutture s on s.id = c.struttura_id
               where c.id = prenotazioni_bnb.camera_id and s.gestore_id = auth.uid()));

drop policy if exists "prenotazioni_bnb utente insert" on public.prenotazioni_bnb;
create policy "prenotazioni_bnb utente insert" on public.prenotazioni_bnb for insert
  with check (utente_id = auth.uid());

drop policy if exists "prenotazioni_bnb update" on public.prenotazioni_bnb;
create policy "prenotazioni_bnb update" on public.prenotazioni_bnb for update
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.camere c
               join public.strutture s on s.id = c.struttura_id
               where c.id = prenotazioni_bnb.camera_id and s.gestore_id = auth.uid()));

-- ----- ristoranti -----
drop policy if exists "ristoranti public read pubblicati" on public.ristoranti;
create policy "ristoranti public read pubblicati" on public.ristoranti for select
  using (stato = 'pubblicato' or gestore_id = auth.uid() or public.is_admin());

drop policy if exists "ristoranti gestore insert" on public.ristoranti;
create policy "ristoranti gestore insert" on public.ristoranti for insert
  with check (gestore_id = auth.uid() and public.has_role('gestore_ristorante'));

drop policy if exists "ristoranti gestore update" on public.ristoranti;
create policy "ristoranti gestore update" on public.ristoranti for update
  using (gestore_id = auth.uid() or public.is_admin())
  with check (gestore_id = auth.uid() or public.is_admin());

drop policy if exists "ristoranti gestore delete" on public.ristoranti;
create policy "ristoranti gestore delete" on public.ristoranti for delete
  using (gestore_id = auth.uid() or public.is_admin());

-- ----- tavoli -----
drop policy if exists "tavoli public read" on public.tavoli;
create policy "tavoli public read" on public.tavoli for select
  using (exists (select 1 from public.ristoranti r
                 where r.id = tavoli.ristorante_id
                   and (r.stato = 'pubblicato' or r.gestore_id = auth.uid() or public.is_admin())));

drop policy if exists "tavoli gestore write" on public.tavoli;
create policy "tavoli gestore write" on public.tavoli for all
  using (public.is_admin()
    or exists (select 1 from public.ristoranti r
               where r.id = tavoli.ristorante_id and r.gestore_id = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.ristoranti r
               where r.id = tavoli.ristorante_id and r.gestore_id = auth.uid()));

-- ----- prenotazioni_tavolo -----
drop policy if exists "prenotazioni_tavolo read" on public.prenotazioni_tavolo;
create policy "prenotazioni_tavolo read" on public.prenotazioni_tavolo for select
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.tavoli t
               join public.ristoranti r on r.id = t.ristorante_id
               where t.id = prenotazioni_tavolo.tavolo_id and r.gestore_id = auth.uid()));

drop policy if exists "prenotazioni_tavolo utente insert" on public.prenotazioni_tavolo;
create policy "prenotazioni_tavolo utente insert" on public.prenotazioni_tavolo for insert
  with check (utente_id = auth.uid());

drop policy if exists "prenotazioni_tavolo update" on public.prenotazioni_tavolo;
create policy "prenotazioni_tavolo update" on public.prenotazioni_tavolo for update
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.tavoli t
               join public.ristoranti r on r.id = t.ristorante_id
               where t.id = prenotazioni_tavolo.tavolo_id and r.gestore_id = auth.uid()));

-- ----- prodotti -----
drop policy if exists "prodotti public read" on public.prodotti;
create policy "prodotti public read" on public.prodotti for select
  using (exists (select 1 from public.ristoranti r
                 where r.id = prodotti.ristorante_id
                   and (r.stato = 'pubblicato' or r.gestore_id = auth.uid() or public.is_admin())));

drop policy if exists "prodotti gestore write" on public.prodotti;
create policy "prodotti gestore write" on public.prodotti for all
  using (public.is_admin()
    or exists (select 1 from public.ristoranti r
               where r.id = prodotti.ristorante_id and r.gestore_id = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.ristoranti r
               where r.id = prodotti.ristorante_id and r.gestore_id = auth.uid()));

-- ----- ordini -----
drop policy if exists "ordini read" on public.ordini;
create policy "ordini read" on public.ordini for select
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.ristoranti r
               where r.id = ordini.ristorante_id and r.gestore_id = auth.uid()));

drop policy if exists "ordini utente insert" on public.ordini;
create policy "ordini utente insert" on public.ordini for insert
  with check (utente_id = auth.uid());

drop policy if exists "ordini gestore update" on public.ordini;
create policy "ordini gestore update" on public.ordini for update
  using (public.is_admin()
    or exists (select 1 from public.ristoranti r
               where r.id = ordini.ristorante_id and r.gestore_id = auth.uid()));

-- ----- ordini_prodotti -----
drop policy if exists "ordini_prodotti read" on public.ordini_prodotti;
create policy "ordini_prodotti read" on public.ordini_prodotti for select
  using (exists (select 1 from public.ordini o
                 where o.id = ordini_prodotti.ordine_id
                   and (o.utente_id = auth.uid() or public.is_admin()
                     or exists (select 1 from public.ristoranti r
                                where r.id = o.ristorante_id and r.gestore_id = auth.uid()))));

drop policy if exists "ordini_prodotti insert" on public.ordini_prodotti;
create policy "ordini_prodotti insert" on public.ordini_prodotti for insert
  with check (exists (select 1 from public.ordini o
                      where o.id = ordini_prodotti.ordine_id and o.utente_id = auth.uid()));

-- ----- corsi -----
drop policy if exists "corsi public read pubblicati" on public.corsi;
create policy "corsi public read pubblicati" on public.corsi for select
  using (stato = 'pubblicato' or gestore_id = auth.uid() or public.is_admin());

drop policy if exists "corsi gestore insert" on public.corsi;
create policy "corsi gestore insert" on public.corsi for insert
  with check (gestore_id = auth.uid() and public.has_role('gestore_video'));

drop policy if exists "corsi gestore update" on public.corsi;
create policy "corsi gestore update" on public.corsi for update
  using (gestore_id = auth.uid() or public.is_admin())
  with check (gestore_id = auth.uid() or public.is_admin());

drop policy if exists "corsi gestore delete" on public.corsi;
create policy "corsi gestore delete" on public.corsi for delete
  using (gestore_id = auth.uid() or public.is_admin());

-- ----- video_lezioni -----
drop policy if exists "video_lezioni read" on public.video_lezioni;
create policy "video_lezioni read" on public.video_lezioni for select
  using (anteprima_gratuita = true or public.is_admin()
    or exists (select 1 from public.corsi c
               where c.id = video_lezioni.corso_id and c.gestore_id = auth.uid())
    or exists (select 1 from public.acquisti_video a
               where a.corso_id = video_lezioni.corso_id and a.utente_id = auth.uid()));

drop policy if exists "video_lezioni gestore write" on public.video_lezioni;
create policy "video_lezioni gestore write" on public.video_lezioni for all
  using (public.is_admin()
    or exists (select 1 from public.corsi c
               where c.id = video_lezioni.corso_id and c.gestore_id = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.corsi c
               where c.id = video_lezioni.corso_id and c.gestore_id = auth.uid()));

-- ----- acquisti_video -----
drop policy if exists "acquisti_video read" on public.acquisti_video;
create policy "acquisti_video read" on public.acquisti_video for select
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.corsi c
               where c.id = acquisti_video.corso_id and c.gestore_id = auth.uid()));

drop policy if exists "acquisti_video utente insert" on public.acquisti_video;
create policy "acquisti_video utente insert" on public.acquisti_video for insert
  with check (utente_id = auth.uid());

-- ----- attrazioni -----
drop policy if exists "attrazioni public read pubblicati" on public.attrazioni;
create policy "attrazioni public read pubblicati" on public.attrazioni for select
  using (stato = 'pubblicato' or gestore_id = auth.uid() or public.is_admin());

drop policy if exists "attrazioni gestore insert" on public.attrazioni;
create policy "attrazioni gestore insert" on public.attrazioni for insert
  with check (gestore_id = auth.uid() and public.has_role('gestore_infopoint'));

drop policy if exists "attrazioni gestore update" on public.attrazioni;
create policy "attrazioni gestore update" on public.attrazioni for update
  using (gestore_id = auth.uid() or public.is_admin())
  with check (gestore_id = auth.uid() or public.is_admin());

drop policy if exists "attrazioni gestore delete" on public.attrazioni;
create policy "attrazioni gestore delete" on public.attrazioni for delete
  using (gestore_id = auth.uid() or public.is_admin());

-- ----- visite_guidate -----
drop policy if exists "visite_guidate public read" on public.visite_guidate;
create policy "visite_guidate public read" on public.visite_guidate for select
  using (stato = 'pubblicato' or gestore_id = auth.uid() or public.is_admin());

drop policy if exists "visite_guidate gestore insert" on public.visite_guidate;
create policy "visite_guidate gestore insert" on public.visite_guidate for insert
  with check (gestore_id = auth.uid() and public.has_role('gestore_infopoint'));

drop policy if exists "visite_guidate gestore update" on public.visite_guidate;
create policy "visite_guidate gestore update" on public.visite_guidate for update
  using (gestore_id = auth.uid() or public.is_admin())
  with check (gestore_id = auth.uid() or public.is_admin());

drop policy if exists "visite_guidate gestore delete" on public.visite_guidate;
create policy "visite_guidate gestore delete" on public.visite_guidate for delete
  using (gestore_id = auth.uid() or public.is_admin());

-- ----- prenotazioni_visita -----
drop policy if exists "prenotazioni_visita read" on public.prenotazioni_visita;
create policy "prenotazioni_visita read" on public.prenotazioni_visita for select
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.visite_guidate v
               where v.id = prenotazioni_visita.visita_id and v.gestore_id = auth.uid()));

drop policy if exists "prenotazioni_visita utente insert" on public.prenotazioni_visita;
create policy "prenotazioni_visita utente insert" on public.prenotazioni_visita for insert
  with check (utente_id = auth.uid());

drop policy if exists "prenotazioni_visita update" on public.prenotazioni_visita;
create policy "prenotazioni_visita update" on public.prenotazioni_visita for update
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.visite_guidate v
               where v.id = prenotazioni_visita.visita_id and v.gestore_id = auth.uid()));

-- ----- tour_virtuali -----
drop policy if exists "tour_virtuali public read" on public.tour_virtuali;
create policy "tour_virtuali public read" on public.tour_virtuali for select
  using (stato = 'pubblicato' or public.is_admin()
    or exists (select 1 from public.attrazioni a
               where a.id = tour_virtuali.attrazione_id and a.gestore_id = auth.uid()));

drop policy if exists "tour_virtuali gestore write" on public.tour_virtuali;
create policy "tour_virtuali gestore write" on public.tour_virtuali for all
  using (public.is_admin()
    or exists (select 1 from public.attrazioni a
               where a.id = tour_virtuali.attrazione_id and a.gestore_id = auth.uid()))
  with check (public.is_admin()
    or exists (select 1 from public.attrazioni a
               where a.id = tour_virtuali.attrazione_id and a.gestore_id = auth.uid()));

-- ----- accessi_tour -----
drop policy if exists "accessi_tour read" on public.accessi_tour;
create policy "accessi_tour read" on public.accessi_tour for select
  using (utente_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.tour_virtuali t
               join public.attrazioni a on a.id = t.attrazione_id
               where t.id = accessi_tour.tour_id and a.gestore_id = auth.uid()));

drop policy if exists "accessi_tour utente insert" on public.accessi_tour;
create policy "accessi_tour utente insert" on public.accessi_tour for insert
  with check (utente_id = auth.uid());
