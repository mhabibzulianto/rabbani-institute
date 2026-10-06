-- Prerequisites: schema.sql, articles_patch.sql, account_center_patch.sql,
-- and madrasah_app_patch.sql. Apply once through the Supabase SQL editor.
begin;

alter table public.account_app_memberships
  drop constraint if exists account_app_memberships_app_slug_check;
alter table public.account_app_memberships
  add constraint account_app_memberships_app_slug_check
  check (app_slug in ('campus', 'store', 'osban', 'madrasah', 'editorial'));

create or replace function public.touch_account_app(target_app text)
returns public.account_app_memberships
language plpgsql security definer set search_path = public
as $$
declare membership public.account_app_memberships;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_app not in ('campus', 'store', 'osban', 'madrasah', 'editorial') then
    raise exception 'Unknown app slug';
  end if;
  if target_app = 'editorial' and not public.can_author_articles() then
    raise exception 'Editorial access required' using errcode = '42501';
  end if;
  insert into public.account_app_memberships (user_id, app_slug)
  values (auth.uid(), target_app)
  on conflict (user_id, app_slug) do update set last_seen_at = now()
  returning * into membership;
  return membership;
end;
$$;
revoke all on function public.touch_account_app(text) from public, anon;
grant execute on function public.touch_account_app(text) to authenticated;

drop policy if exists "Users can manage own app memberships" on public.account_app_memberships;
create policy "Users can manage own app memberships"
on public.account_app_memberships for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (app_slug <> 'editorial' or public.can_author_articles())
);

-- Additive migration: Plate/Gutenberg readers continue using the legacy fields.
-- NULL means legacy content has not yet been converted. Do not invent an empty
-- Tiptap document for existing articles: doing so would hide their actual content.
alter table public.articles
  add column if not exists content_raw text not null default '',
  add column if not exists content_legacy_backup jsonb,
  add column if not exists content_json jsonb,
  add column if not exists content_schema_version integer not null default 1,
  add column if not exists version bigint not null default 1,
  add column if not exists last_saved_at timestamptz;
alter table public.articles drop constraint if exists articles_tiptap_document;
alter table public.articles add constraint articles_tiptap_document check (
  content_json is null or coalesce(
    jsonb_typeof(content_json) = 'object'
    and content_json->>'type' = 'doc'
    and jsonb_typeof(content_json->'content') = 'array', false
  )
);
alter table public.articles drop constraint if exists articles_positive_version;
alter table public.articles add constraint articles_positive_version
  check (version > 0 and content_schema_version = 1);

-- A trigger protects status/content even when clients write via REST directly.
-- No application-side flag or custom GUC can bypass these checks.
create or replace function public.enforce_editorial_article_workflow()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  reviewer boolean := exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
begin
  if auth.role() is distinct from 'service_role' then
    if actor is null or not public.can_author_articles() then
      raise exception 'Editorial access required' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      if new.status <> 'draft' then
        raise exception 'New articles must start as draft' using errcode = '42501';
      end if;
      if not reviewer and (new.author_id <> actor or new.admin_note is not null) then
        raise exception 'Only create your own draft' using errcode = '42501';
      end if;
      new.submitted_at := null;
      new.published_at := null;
    else
      if new.author_id is distinct from old.author_id then
        raise exception 'Article ownership cannot be changed' using errcode = '42501';
      end if;
      if not reviewer then
        if old.author_id <> actor then
          raise exception 'Only edit your own article' using errcode = '42501';
        end if;
        if old.status not in ('draft', 'rejected') then
          raise exception 'Article is locked for review or publication' using errcode = '42501';
        end if;
        if new.admin_note is distinct from old.admin_note
          or new.published_at is distinct from old.published_at then
          raise exception 'Review fields require administrator access' using errcode = '42501';
        end if;
        if new.status not in ('draft', 'submitted')
          and new.status is distinct from old.status then
          raise exception 'Writers cannot publish, reject or archive articles' using errcode = '42501';
        end if;
        if old.status = 'rejected' and new.status = 'submitted' then
          raise exception 'Return rejected article to draft before submitting';
        end if;
      end if;
      if new.status is distinct from old.status and not (
        (old.status = 'draft' and new.status = 'submitted')
        or (old.status = 'submitted' and new.status in ('draft', 'rejected', 'published'))
        or (old.status = 'rejected' and new.status = 'draft')
        or (old.status = 'published' and new.status = 'archived')
        or (old.status = 'archived' and new.status = 'draft')
      ) then
        raise exception 'Invalid article status transition: % -> %', old.status, new.status;
      end if;
      if new.version not in (old.version, old.version + 1) then
        raise exception 'Invalid article version';
      end if;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.version := 1;
  else
    -- Legacy editors cannot leave a stale Tiptap document behind.
    if (new.blocks is distinct from old.blocks or new.content_raw is distinct from old.content_raw)
      and new.content_json is not distinct from old.content_json then
      new.content_json := null;
    end if;
    new.version := old.version + 1;
    if new.status is distinct from old.status then
      new.submitted_at := case when new.status = 'submitted' then now() else old.submitted_at end;
      new.published_at := case when new.status = 'published' then now()
        when new.status = 'draft' then null else old.published_at end;
    else
      new.submitted_at := old.submitted_at;
      new.published_at := old.published_at;
    end if;
  end if;
  new.last_saved_at := now();
  return new;
end;
$$;
revoke all on function public.enforce_editorial_article_workflow() from public, anon, authenticated;
drop trigger if exists enforce_editorial_article_workflow on public.articles;
create trigger enforce_editorial_article_workflow
before insert or update on public.articles
for each row execute function public.enforce_editorial_article_workflow();

drop policy if exists "Authors can manage visible articles" on public.articles;
create policy "Authors can manage visible articles" on public.articles
for select to authenticated using (
  status = 'published' or (public.can_author_articles() and (
    author_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ))
);
drop policy if exists "Authors can create articles" on public.articles;
create policy "Authors can create articles" on public.articles
for insert to authenticated with check (
  public.can_author_articles() and status = 'draft' and (
    author_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
);
drop policy if exists "Authors can update their articles" on public.articles;
create policy "Authors can update their articles" on public.articles
for update to authenticated
using (public.can_author_articles() and (
  author_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
))
with check (public.can_author_articles() and (
  author_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
));
drop policy if exists "Authors can delete their articles" on public.articles;
create policy "Authors can delete their articles" on public.articles
for delete to authenticated using (
  status = 'draft' and public.can_author_articles() and (
    author_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
);

-- All status changes use the caller's RLS and the workflow trigger above.
-- Expected version provides atomic conflict detection for two clients/tabs.
create or replace function public.transition_editorial_article(
  target_article_id bigint, expected_version bigint, target_status text,
  review_note text default null
)
returns public.articles language plpgsql security invoker set search_path = public
as $$
declare result public.articles;
begin
  if auth.uid() is null or not public.can_author_articles() then
    raise exception 'Editorial access required' using errcode = '42501';
  end if;
  update public.articles set status = target_status,
    admin_note = case when exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    ) then coalesce(review_note, admin_note) else admin_note end
  where id = target_article_id and version = expected_version
  returning * into result;
  if not found then
    raise exception 'Article unavailable or changed; reload before retrying' using errcode = '40001';
  end if;
  return result;
end;
$$;
revoke all on function public.transition_editorial_article(bigint, bigint, text, text) from public, anon;
grant execute on function public.transition_editorial_article(bigint, bigint, text, text) to authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant usage, select on sequence public.articles_id_seq to authenticated;

notify pgrst, 'reload schema';
commit;
