-- Phase 4; apply after landing_page_editor_patch.sql. No automatic publication.
begin;
create table if not exists public.landing_publication_sync (
  revision_id bigint primary key references public.landing_page_revisions(id),
  attempts integer not null default 0, last_attempt_at timestamptz,
  synced_at timestamptz, last_error text not null default ''
);
create table if not exists public.landing_sync_requests (
  proof_hash text primary key, revision_id bigint not null references public.landing_page_revisions(id),
  expires_at timestamptz not null, consumed_at timestamptz
);
alter table public.landing_publication_sync enable row level security;
alter table public.landing_sync_requests enable row level security;
revoke all on public.landing_publication_sync,public.landing_sync_requests from public,anon,authenticated;
grant select on public.landing_publication_sync to authenticated;
drop policy if exists "Landing admin reads sync" on public.landing_publication_sync;
create policy "Landing admin reads sync" on public.landing_publication_sync for select to authenticated using(public.is_landing_admin());
insert into public.landing_publication_sync(revision_id) select revision_id from public.landing_page_publications on conflict do nothing;

create or replace function public.assert_landing_publication(doc jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare b jsonb; p jsonb; item jsonb; selected_id bigint; content_text text;
begin
  if not public.valid_landing_document(doc) then raise exception 'Invalid landing document' using errcode='22023'; end if;
  if btrim(doc#>>'{seo,title}')='' or btrim(doc#>>'{seo,description}')='' then raise exception 'SEO required' using errcode='22023'; end if;
  if (select count(*) from jsonb_array_elements(doc->'blocks') x where x->>'type'='hero' and (x->>'enabled')::boolean)<>1 then raise exception 'Exactly one active hero required' using errcode='22023'; end if;
  for b in select value from jsonb_array_elements(doc->'blocks') loop
    if not (b->>'enabled')::boolean then continue; end if;
    p:=b->'props';
    if b->>'type'<>'text' and coalesce(btrim(p->>'title'),'')='' then raise exception 'Block title required' using errcode='22023'; end if;
    for item in select value from jsonb_array_elements(coalesce(p->'buttons','[]')) loop
      if btrim(item->>'label')='' or btrim(item->>'href')='' then raise exception 'Button label and destination required' using errcode='22023'; end if;
    end loop;
    if b->>'type'='imageText' and coalesce(btrim(p#>>'{image,src}'),'')='' then raise exception 'Image required' using errcode='22023'; end if;
    if b->>'type' in ('text','imageText') then
      select string_agg(value#>>'{}',' ') into content_text from jsonb_path_query(p->'content','$.** ? (@.type == "text").text') as nodes(value);
      if coalesce(btrim(content_text),'')='' then raise exception 'Text required' using errcode='22023'; end if;
    end if;
    if b->>'type'='features' then
      for item in select value from jsonb_array_elements(p->'items') loop
        if btrim(item->>'title')='' or btrim(item->>'description')='' then raise exception 'Feature content required' using errcode='22023'; end if;
      end loop;
    end if;
    if b->>'type'='faq' then
      for item in select value from jsonb_array_elements(p->'items') loop
        if btrim(item->>'question')='' or btrim(item->>'answer')='' then raise exception 'FAQ content required' using errcode='22023'; end if;
      end loop;
    end if;
    if p->>'source'='selected' then
      if jsonb_array_length(p->'selectedIds')=0 then raise exception 'Select public content' using errcode='22023'; end if;
      for selected_id in select value::bigint from jsonb_array_elements_text(p->'selectedIds') loop
        if b->>'type'='courses' and not exists(select 1 from public.courses where id=selected_id and status='published') then raise exception 'Selected course is not public' using errcode='22023'; end if;
        if b->>'type'='articles' and not exists(select 1 from public.articles where id=selected_id and status='published') then raise exception 'Selected article is not public' using errcode='22023'; end if;
        if b->>'type'='exams' and not exists(select 1 from public.exam_modules where id=selected_id and is_published) then raise exception 'Selected exam is not public' using errcode='22023'; end if;
      end loop;
    end if;
  end loop;
end;
$$;
create or replace function public.publish_landing_page(target_slug text, expected_version bigint, revision_note text default '')
returns public.landing_page_publications language plpgsql security definer set search_path='' as $$
declare p public.landing_pages; r public.landing_page_revisions; published public.landing_page_publications;
begin
  if not public.is_landing_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if revision_note is null or length(revision_note)>1000 then raise exception 'Invalid revision note' using errcode='22023'; end if;
  select * into p from public.landing_pages where slug=target_slug for update;
  if not found then raise exception 'Landing unavailable' using errcode='22023'; end if;
  if expected_version is null or p.draft_version<>expected_version then raise exception 'Draft changed' using errcode='40001'; end if;
  perform public.assert_landing_publication(p.draft_document);
  insert into public.landing_page_revisions(page_slug,draft_version,document,note,created_by) values(p.slug,p.draft_version,p.draft_document,revision_note,auth.uid()) on conflict(page_slug,draft_version) do nothing;
  select * into r from public.landing_page_revisions where page_slug=p.slug and draft_version=p.draft_version;
  insert into public.landing_page_publications(page_slug,revision_id,document,published_at) values(p.slug,r.id,r.document,r.created_at) on conflict(page_slug) do update set revision_id=excluded.revision_id,document=excluded.document,published_at=excluded.published_at returning * into published;
  insert into public.landing_publication_sync(revision_id) values(r.id) on conflict do nothing;
  return published;
end;
$$;
create or replace function public.restore_landing_revision(target_revision bigint,expected_version bigint)
returns public.landing_pages language plpgsql security definer set search_path='' as $$
declare p public.landing_pages; r public.landing_page_revisions;
begin
  if not public.is_landing_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into r from public.landing_page_revisions where id=target_revision and page_slug='home';
  if not found then raise exception 'Revision unavailable' using errcode='22023'; end if;
  select * into p from public.landing_pages where slug=r.page_slug for update;
  if expected_version is null or p.draft_version<>expected_version then raise exception 'Draft changed' using errcode='40001'; end if;
  update public.landing_pages set draft_document=r.document,draft_version=draft_version+1,updated_by=auth.uid(),updated_at=now() where slug=p.slug returning * into p;
  return p;
end;
$$;
create or replace function public.register_landing_sync(target_revision bigint,request_proof text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_landing_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if request_proof is null or request_proof !~ '^[a-f0-9]{64}$' then raise exception 'Invalid proof' using errcode='22023'; end if;
  perform 1 from public.landing_page_publications where page_slug='home' and revision_id=target_revision for update;
  if not found then raise exception 'Publication changed' using errcode='40001'; end if;
  delete from public.landing_sync_requests where expires_at<now();
  insert into public.landing_sync_requests values(request_proof,target_revision,now()+interval '5 minutes',null);
  update public.landing_publication_sync set attempts=attempts+1,last_attempt_at=now() where revision_id=target_revision;
end;
$$;
create or replace function public.claim_landing_sync(request_proof text)
returns bigint language plpgsql security definer set search_path='' as $$
declare claimed bigint;
begin
  update public.landing_sync_requests set consumed_at=now() where proof_hash=request_proof and expires_at>now() and consumed_at is null returning revision_id into claimed;
  return claimed;
end;
$$;
create or replace function public.finish_landing_sync(target_revision bigint,succeeded boolean,error_note text default '')
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_landing_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if succeeded is null or error_note is null or length(error_note)>500 then raise exception 'Invalid sync result' using errcode='22023'; end if;
  update public.landing_publication_sync set synced_at=case when succeeded then now() else synced_at end,last_error=case when succeeded then '' else error_note end where revision_id=target_revision;
end;
$$;
revoke all on function public.assert_landing_publication(jsonb),public.publish_landing_page(text,bigint,text),public.restore_landing_revision(bigint,bigint),public.register_landing_sync(bigint,text),public.claim_landing_sync(text),public.finish_landing_sync(bigint,boolean,text) from public,anon,authenticated;
grant execute on function public.publish_landing_page(text,bigint,text),public.restore_landing_revision(bigint,bigint),public.register_landing_sync(bigint,text),public.finish_landing_sync(bigint,boolean,text) to authenticated;
-- Only registered HMAC proofs can be claimed; durable single use across instances.
grant execute on function public.claim_landing_sync(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
