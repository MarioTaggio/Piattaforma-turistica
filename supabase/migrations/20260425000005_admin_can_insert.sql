-- =============================================================================
-- Piattaforma Turistica — PATCH: admin bypass on INSERT policies for the
-- 6 gestore-owned root tables (eventi, strutture, ristoranti, corsi,
-- attrazioni, visite_guidate).
--
-- Why: original INSERT policies required `has_role('gestore_xxx')`, which
-- excludes admin even though admin should bypass everything.
--
-- Sub-resource tables (camere, tavoli, prodotti, video_lezioni, tour_virtuali)
-- already use FOR ALL with `public.is_admin() or ...` so they're unaffected.
--
-- Idempotent: every policy is dropped and re-created.
-- Safe to run on an existing database via the Supabase SQL Editor.
-- =============================================================================

-- ----- eventi -----
drop policy if exists "eventi gestore insert" on public.eventi;
create policy "eventi gestore insert" on public.eventi for insert
  with check (
    public.is_admin()
    or (gestore_id = auth.uid() and public.has_role('gestore_eventi'))
  );

-- ----- strutture -----
drop policy if exists "strutture gestore insert" on public.strutture;
create policy "strutture gestore insert" on public.strutture for insert
  with check (
    public.is_admin()
    or (gestore_id = auth.uid() and public.has_role('gestore_bnb'))
  );

-- ----- ristoranti -----
drop policy if exists "ristoranti gestore insert" on public.ristoranti;
create policy "ristoranti gestore insert" on public.ristoranti for insert
  with check (
    public.is_admin()
    or (gestore_id = auth.uid() and public.has_role('gestore_ristorante'))
  );

-- ----- corsi -----
drop policy if exists "corsi gestore insert" on public.corsi;
create policy "corsi gestore insert" on public.corsi for insert
  with check (
    public.is_admin()
    or (gestore_id = auth.uid() and public.has_role('gestore_video'))
  );

-- ----- attrazioni -----
drop policy if exists "attrazioni gestore insert" on public.attrazioni;
create policy "attrazioni gestore insert" on public.attrazioni for insert
  with check (
    public.is_admin()
    or (gestore_id = auth.uid() and public.has_role('gestore_infopoint'))
  );

-- ----- visite_guidate -----
drop policy if exists "visite_guidate gestore insert" on public.visite_guidate;
create policy "visite_guidate gestore insert" on public.visite_guidate for insert
  with check (
    public.is_admin()
    or (gestore_id = auth.uid() and public.has_role('gestore_infopoint'))
  );
