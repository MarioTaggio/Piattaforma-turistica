-- =============================================================================
-- Bucket immagini per modulo + RLS
--
-- Ogni modulo ha il suo bucket public dedicato (size limit 5MB, mime allowlist).
-- Le policy permettono:
--   - SELECT pubblico (immagini visibili dal frontend senza auth)
--   - INSERT da utenti autenticati (l'autorizzazione fine — gestore di QUEL
--     contenuto specifico — è demandata alla server action lato app)
--   - UPDATE/DELETE da utenti autenticati
--
-- Convenzione path: <bucket>/<entity_id>/<uuid>.<ext>
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('strutture',     'strutture',     true, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp']),
  ('eventi',        'eventi',        true, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp']),
  ('ristoranti',    'ristoranti',    true, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp']),
  ('prodotti',      'prodotti',      true, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp']),
  ('corsi',         'corsi',         true, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp']),
  ('attrazioni',    'attrazioni',    true, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp']),
  ('tour-virtuali', 'tour-virtuali', true, 5 * 1024 * 1024, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----- RLS policies generate via DO block per evitare ripetizione -----
do $$
declare
  bucket_name text;
  buckets text[] := array[
    'strutture','eventi','ristoranti','prodotti','corsi','attrazioni','tour-virtuali'
  ];
begin
  foreach bucket_name in array buckets loop
    -- public read
    execute format(
      'drop policy if exists "public read %1$s" on storage.objects',
      bucket_name
    );
    execute format(
      'create policy "public read %1$s" on storage.objects for select using (bucket_id = %1$L)',
      bucket_name
    );

    -- authenticated insert
    execute format(
      'drop policy if exists "auth upload %1$s" on storage.objects',
      bucket_name
    );
    execute format(
      'create policy "auth upload %1$s" on storage.objects for insert with check (bucket_id = %1$L and auth.role() = ''authenticated'')',
      bucket_name
    );

    -- authenticated update
    execute format(
      'drop policy if exists "auth update %1$s" on storage.objects',
      bucket_name
    );
    execute format(
      'create policy "auth update %1$s" on storage.objects for update using (bucket_id = %1$L and auth.role() = ''authenticated'')',
      bucket_name
    );

    -- authenticated delete
    execute format(
      'drop policy if exists "auth delete %1$s" on storage.objects',
      bucket_name
    );
    execute format(
      'create policy "auth delete %1$s" on storage.objects for delete using (bucket_id = %1$L and auth.role() = ''authenticated'')',
      bucket_name
    );
  end loop;
end;
$$;
