-- =============================================================================
-- Storage buckets for user-uploaded media.
-- =============================================================================
-- `images`: public read (covers/avatars/photos). Authenticated users can
--           write into a folder named after their user id.
-- `videos`: public read (course lessons). Same write rule.
--           Real protection of video access is enforced at the application
--           layer (RLS on `acquisti_video` controls who can read the URL).

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('images', 'images', true, 10 * 1024 * 1024),       -- 10 MB
  ('videos', 'videos', true, 500 * 1024 * 1024)       -- 500 MB
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- ----- Storage RLS policies -----
-- Public read on both buckets.
drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects for select
  using (bucket_id = 'images');

drop policy if exists "public read videos" on storage.objects;
create policy "public read videos" on storage.objects for select
  using (bucket_id = 'videos');

-- Authenticated users can write into a folder named with their auth.uid().
-- Path convention enforced at app level: <bucket>/<user_id>/<filename>.
drop policy if exists "auth write images own folder" on storage.objects;
create policy "auth write images own folder" on storage.objects for insert
  with check (
    bucket_id = 'images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth update images own folder" on storage.objects;
create policy "auth update images own folder" on storage.objects for update
  using (
    bucket_id = 'images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth delete images own folder" on storage.objects;
create policy "auth delete images own folder" on storage.objects for delete
  using (
    bucket_id = 'images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth write videos own folder" on storage.objects;
create policy "auth write videos own folder" on storage.objects for insert
  with check (
    bucket_id = 'videos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth update videos own folder" on storage.objects;
create policy "auth update videos own folder" on storage.objects for update
  using (
    bucket_id = 'videos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "auth delete videos own folder" on storage.objects;
create policy "auth delete videos own folder" on storage.objects for delete
  using (
    bucket_id = 'videos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
