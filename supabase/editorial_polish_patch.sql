-- Phase 6. Run after editorial_workflow_patch.sql. Safe to rerun.
begin;
create or replace function public.restore_editorial_revision(
  target_article_id bigint, expected_version bigint, target_revision_id bigint
)
returns public.articles language plpgsql security definer set search_path = '' as $$
declare a public.articles; r public.article_revisions; reviewer boolean;
begin
  if auth.uid() is null or not public.can_author_articles() then
    raise exception 'Editorial access required' using errcode = '42501';
  end if;
  reviewer := exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
  select * into a from public.articles where id = target_article_id
    and (author_id = auth.uid() or reviewer) for update;
  if not found then raise exception 'Article unavailable' using errcode = '42501'; end if;
  if a.version <> expected_version or expected_version is null then
    raise exception 'Article changed; reload before restoring' using errcode = '40001';
  end if;
  if a.status not in ('draft','rejected') then
    raise exception 'Return article to draft before restoring' using errcode = '42501';
  end if;
  select * into r from public.article_revisions where id = target_revision_id and article_id = a.id;
  if not found then raise exception 'Revision unavailable' using errcode = '22023'; end if;
  perform public.write_editorial_revision(a, 'before_restore');
  update public.articles set
    title = r.metadata_json->>'title', excerpt = r.metadata_json->>'excerpt',
    topic = r.metadata_json->>'topic',
    tags = case when jsonb_typeof(r.metadata_json->'tags') = 'array'
      then array(select jsonb_array_elements_text(r.metadata_json->'tags')) else null end,
    category_id = nullif(r.metadata_json->>'category_id','')::bigint,
    cover_image_url = r.metadata_json->>'cover_image_url',
    content_json = r.content_json, content_raw = r.content_raw, blocks = r.blocks
  where id = a.id returning * into a;
  perform public.write_editorial_revision(a, 'restored');
  return a;
end;
$$;
revoke all on function public.restore_editorial_revision(bigint,bigint,bigint) from public,anon;
grant execute on function public.restore_editorial_revision(bigint,bigint,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
