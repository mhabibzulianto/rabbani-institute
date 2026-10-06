-- Phase 5. Run after editorial_foundation_patch.sql (and media patch).
begin;
alter table public.articles
  add column if not exists scheduled_at timestamptz,
  add column if not exists publication_error text;
alter table public.articles drop constraint if exists articles_schedule_status;
alter table public.articles add constraint articles_schedule_status check (scheduled_at is null or status = 'submitted');
create index if not exists articles_due_publication on public.articles(scheduled_at) where status = 'submitted' and publication_error is null;

create table if not exists public.article_revisions (
  id bigint generated always as identity primary key,
  article_id bigint not null references public.articles(id) on delete cascade,
  revision_number bigint not null,
  article_version bigint not null,
  reason text not null,
  content_json jsonb,
  content_raw text,
  blocks jsonb,
  metadata_json jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(article_id, revision_number),
  unique(article_id, article_version, reason)
);
alter table public.article_revisions enable row level security;
revoke all on public.article_revisions from anon;
revoke insert, update, delete, truncate, references, trigger on public.article_revisions from authenticated;
grant select on public.article_revisions to authenticated;
drop policy if exists editorial_revision_read on public.article_revisions;
create policy editorial_revision_read on public.article_revisions for select to authenticated using (
  public.can_author_articles() and exists (
    select 1 from public.articles a where a.id = article_id and (a.author_id = auth.uid()
      or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  )
);

-- Only triggers and the guarded snapshot RPC can write immutable revisions.
create or replace function public.write_editorial_revision(a public.articles, snapshot_reason text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare snapshot_id bigint;
begin
  insert into public.article_revisions(article_id, revision_number, article_version, reason,
    content_json, content_raw, blocks, metadata_json, created_by)
  values (a.id, (select coalesce(max(r.revision_number),0)+1 from public.article_revisions r where r.article_id = a.id),
    a.version, snapshot_reason, a.content_json, a.content_raw, a.blocks,
    to_jsonb(a) - array['content_json','content_raw','blocks','content_legacy_backup'],
    case when auth.role() = 'service_role' then null else auth.uid() end)
  on conflict (article_id, article_version, reason) do nothing returning id into snapshot_id;
  return snapshot_id;
end;
$$;
revoke all on function public.write_editorial_revision(public.articles,text) from public,anon,authenticated;

create or replace function public.editorial_workflow_details()
returns trigger language plpgsql security definer set search_path = '' as $$
declare reviewer boolean := exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
begin
  if auth.role() is distinct from 'service_role' then
    if not reviewer and ((tg_op = 'INSERT' and (new.scheduled_at is not null or new.publication_error is not null))
      or (tg_op = 'UPDATE' and (new.scheduled_at is distinct from old.scheduled_at or new.publication_error is distinct from old.publication_error))) then
      raise exception 'Scheduling requires administrator access' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.status = 'rejected' and old.status <> 'rejected'
      and (new.admin_note is null or length(btrim(new.admin_note)) < 3) then
      raise exception 'A rejection reason is required' using errcode = '22023';
    end if;
    if new.admin_note is not null and length(new.admin_note) > 4000 then raise exception 'Review note is too long'; end if;
  end if;
  if new.status <> 'submitted' then new.scheduled_at := null; new.publication_error := null; end if;
  return new;
end;
$$;
revoke all on function public.editorial_workflow_details() from public,anon,authenticated;
drop trigger if exists editorial_workflow_details on public.articles;
-- Runs before the foundation workflow trigger; clears schedules on status changes.
create trigger editorial_workflow_details before insert or update on public.articles
for each row execute function public.editorial_workflow_details();

create or replace function public.capture_editorial_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare snapshot_reason text;
begin
  if tg_op = 'INSERT' then snapshot_reason := 'created';
  else
    if not exists(select 1 from public.article_revisions where article_id = new.id) then
      perform public.write_editorial_revision(old, 'baseline');
    end if;
    if new.status is distinct from old.status then snapshot_reason := new.status;
    elsif new.scheduled_at is distinct from old.scheduled_at then snapshot_reason := case when new.scheduled_at is null then 'schedule_cancelled' else 'scheduled' end;
    elsif new.publication_error is distinct from old.publication_error and new.publication_error is not null then snapshot_reason := 'publication_failed';
    elsif new.admin_note is distinct from old.admin_note then snapshot_reason := 'review_note';
    elsif not exists(select 1 from public.article_revisions where article_id = new.id and created_at > now() - interval '5 minutes') then snapshot_reason := 'autosave';
    end if;
  end if;
  if snapshot_reason is not null then perform public.write_editorial_revision(new, snapshot_reason); end if;
  return new;
end;
$$;
revoke all on function public.capture_editorial_revision() from public,anon,authenticated;
drop trigger if exists capture_editorial_revision on public.articles;
create trigger capture_editorial_revision after insert or update on public.articles
for each row execute function public.capture_editorial_revision();

create or replace function public.snapshot_editorial_article(target_article_id bigint, expected_version bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare a public.articles; snapshot_id bigint;
begin
  if auth.uid() is null or not public.can_author_articles() then raise exception 'Editorial access required' using errcode = '42501'; end if;
  select * into a from public.articles where id = target_article_id and version = expected_version
    and (author_id = auth.uid() or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')) for update;
  if not found then raise exception 'Article changed or unavailable' using errcode = '40001'; end if;
  snapshot_id := public.write_editorial_revision(a, 'manual');
  if snapshot_id is null then select id into snapshot_id from public.article_revisions where article_id = a.id and article_version = a.version and reason = 'manual'; end if;
  return snapshot_id;
end;
$$;
revoke all on function public.snapshot_editorial_article(bigint,bigint) from public,anon;
grant execute on function public.snapshot_editorial_article(bigint,bigint) to authenticated;

create or replace function public.editorial_scheduler_ready()
returns boolean language plpgsql security definer set search_path = '' as $$
declare ready boolean := false;
begin
  if not exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') then return false; end if;
  if to_regclass('cron.job') is null then return false; end if;
  execute 'select exists(select 1 from cron.job where jobname = ''editorial-publish-due'' and active and database = current_database() and username = current_user and command = ''select public.publish_due_editorial_articles();'')' into ready;
  return ready;
end;
$$;
revoke all on function public.editorial_scheduler_ready() from public,anon;
grant execute on function public.editorial_scheduler_ready() to authenticated;

create or replace function public.schedule_editorial_article(target_article_id bigint, expected_version bigint, publish_at timestamptz)
returns public.articles language plpgsql security invoker set search_path = '' as $$
declare a public.articles;
begin
  if not exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if publish_at is not null then
    if not public.editorial_scheduler_ready() then raise exception 'Publication scheduler is not active' using errcode = '55000'; end if;
    if publish_at <= now() or publish_at > now() + interval '1 year' then raise exception 'Choose a future date within one year' using errcode = '22023'; end if;
  end if;
  update public.articles set scheduled_at = publish_at, publication_error = null
  where id = target_article_id and version = expected_version and status = 'submitted'
    and (publish_at is null or (length(btrim(title)) > 0 and content_json is not null and jsonb_path_exists(content_json, '$.** ? (@.type == "text" && @.text != "")')))
  returning * into a;
  if not found then raise exception 'Article changed, unavailable, or has no text' using errcode = '40001'; end if;
  return a;
end;
$$;
revoke all on function public.schedule_editorial_article(bigint,bigint,timestamptz) from public,anon;
grant execute on function public.schedule_editorial_article(bigint,bigint,timestamptz) to authenticated;

-- Privileged database worker. No authenticated/anonymous access or browser cron.
create or replace function public.publish_due_editorial_articles()
returns integer language plpgsql security definer set search_path = '' as $$
declare a public.articles; processed integer := 0; previous_role text := current_setting('request.jwt.claim.role',true);
begin
  perform set_config('request.jwt.claim.role','service_role',true);
  for a in select * from public.articles where status = 'submitted' and scheduled_at <= now()
    and publication_error is null order by scheduled_at,id limit 50 for update skip locked loop
    begin
      if a.content_json is null or not jsonb_path_exists(a.content_json, '$.** ? (@.type == "text" && @.text != "")') or length(btrim(a.title)) = 0 then
        raise exception 'Article has no text';
      end if;
      update public.articles set status = 'published' where id = a.id and status = 'submitted' and scheduled_at <= now();
      processed := processed + 1;
    exception when others then
      update public.articles set publication_error = 'Publikasi otomatis gagal. Periksa isi artikel lalu jadwalkan ulang.' where id = a.id;
    end;
  end loop;
  perform set_config('request.jwt.claim.role',coalesce(previous_role,''),true);
  return processed;
end;
$$;
revoke all on function public.publish_due_editorial_articles() from public,anon,authenticated;
grant execute on function public.publish_due_editorial_articles() to service_role;

-- Supabase Cron: one named job, rerunning replaces it rather than duplicating it.
do $$
begin
  if exists(select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('editorial-publish-due','* * * * *','select public.publish_due_editorial_articles();');
  else raise notice 'pg_cron unavailable: automatic publication is disabled until a Cron job is installed.';
  end if;
exception when others then
  raise warning 'Cron installation failed; configure editorial-publish-due manually in Supabase Cron. %', sqlerrm;
end;
$$;
notify pgrst, 'reload schema';
commit;
