-- Phase 4. Run AFTER editorial_foundation_patch.sql. Safe to rerun.
begin;

create table if not exists public.editorial_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  path text not null unique,
  name text not null check (length(name) between 1 and 255),
  mime_type text not null,
  kind text not null check (kind in ('image','video','audio','document')),
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  alt text not null default '' check (length(alt) <= 500),
  caption text not null default '' check (length(caption) <= 500),
  created_at timestamptz not null default now(),
  constraint editorial_media_path check (path like owner_id::text || '/' || id::text || '.%' and path !~ '\.\.' and path !~ '/.*/'),
  constraint editorial_media_format check (
    (kind = 'image' and mime_type in ('image/jpeg','image/png','image/webp','image/gif') and size_bytes <= 10485760) or
    (kind = 'video' and mime_type in ('video/mp4','video/webm')) or
    (kind = 'audio' and mime_type in ('audio/mpeg','audio/ogg','audio/wav','audio/x-wav')) or
    (kind = 'document' and mime_type = 'application/pdf')
  )
);
create index if not exists editorial_media_owner_created on public.editorial_media(owner_id, created_at desc);
alter table public.editorial_media enable row level security;
revoke all on public.editorial_media from anon;
revoke update, delete, truncate, references, trigger on public.editorial_media from authenticated;
grant select, insert on public.editorial_media to authenticated;
drop policy if exists editorial_media_read on public.editorial_media;
create policy editorial_media_read on public.editorial_media for select to authenticated using (
  public.can_author_articles() and (owner_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
);
drop policy if exists editorial_media_insert on public.editorial_media;
create policy editorial_media_insert on public.editorial_media for insert to authenticated with check (
  public.can_author_articles() and owner_id = auth.uid()
);

-- Public media URLs are required by published articles. Library metadata stays private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('editorial-media','editorial-media',true,52428800,array[
  'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm',
  'audio/mpeg','audio/ogg','audio/wav','audio/x-wav','application/pdf'
]) on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists editorial_storage_insert on storage.objects;
create policy editorial_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'editorial-media' and public.can_author_articles()
  and split_part(name,'/',1) = auth.uid()::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mp3|ogg|wav|pdf)$'
);
drop policy if exists editorial_storage_cleanup on storage.objects;
create policy editorial_storage_cleanup on storage.objects for delete to authenticated using (
  bucket_id = 'editorial-media' and public.can_author_articles()
  and split_part(name,'/',1) = auth.uid()::text
  and not exists (select 1 from public.editorial_media where path = storage.objects.name)
);
drop policy if exists editorial_storage_read on storage.objects;
create policy editorial_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'editorial-media' and public.can_author_articles() and (
    split_part(name,'/',1) = auth.uid()::text or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
);

-- Writers may create taxonomy entries, but cannot modify existing shared categories.
create or replace function public.create_editorial_category(category_title text)
returns table (id bigint, title_id text)
language plpgsql security definer set search_path = '' as $$
declare
  clean_title text := btrim(category_title);
  category_slug text;
begin
  if auth.uid() is null or not public.can_author_articles() then raise exception 'Editorial access required' using errcode = '42501'; end if;
  if clean_title is null or length(clean_title) not between 2 and 120 then raise exception 'Invalid category title' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(clean_title), 0));
  return query select c.id, c.title_id from public.categories c where lower(btrim(c.title_id)) = lower(clean_title) and c.is_active order by c.id limit 1;
  if found then return; end if;
  category_slug := btrim(regexp_replace(lower(clean_title), '[^a-z0-9]+', '-', 'g'), '-');
  if category_slug = '' then category_slug := 'kategori'; end if;
  category_slug := left(category_slug,100) || '-' || replace(gen_random_uuid()::text,'-','');
  return query insert into public.categories as c (title_id, slug, is_active)
    values (clean_title, category_slug, true) returning c.id, c.title_id;
end;
$$;
revoke all on function public.create_editorial_category(text) from public, anon;
grant execute on function public.create_editorial_category(text) to authenticated;
notify pgrst, 'reload schema';
commit;
