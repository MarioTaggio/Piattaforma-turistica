-- =============================================================================
-- Storage bucket "platform-assets"
--
-- Asset di piattaforma caricati dall'admin (logo, immagini di branding, ecc.).
-- Lettura pubblica per servire il logo a tutti i visitatori; scrittura solo
-- admin (verificata via public.is_admin()).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('platform-assets', 'platform-assets', true, 5 * 1024 * 1024)  -- 5 MB
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists "public read platform-assets" on storage.objects;
create policy "public read platform-assets" on storage.objects for select
  using (bucket_id = 'platform-assets');

drop policy if exists "admin write platform-assets" on storage.objects;
create policy "admin write platform-assets" on storage.objects for insert
  with check (bucket_id = 'platform-assets' and public.is_admin());

drop policy if exists "admin update platform-assets" on storage.objects;
create policy "admin update platform-assets" on storage.objects for update
  using (bucket_id = 'platform-assets' and public.is_admin());

drop policy if exists "admin delete platform-assets" on storage.objects;
create policy "admin delete platform-assets" on storage.objects for delete
  using (bucket_id = 'platform-assets' and public.is_admin());
