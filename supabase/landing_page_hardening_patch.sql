-- Phase 5; apply after the phase 4 publication patch. No data or publication changes.
begin;
create or replace function public.assert_landing_publication(doc jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare b jsonb; p jsonb; item jsonb; selected_id bigint; content_text text;
begin
  if not public.valid_landing_document(doc) then raise exception 'Invalid landing document' using errcode='22023'; end if;
  if btrim(doc#>>'{seo,title}', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF')='' or btrim(doc#>>'{seo,description}', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF')='' then raise exception 'SEO required' using errcode='22023'; end if;
  if coalesce(doc#>>'{seo,image}','') like '#%' then raise exception 'SEO image must reference a file' using errcode='22023'; end if;
  if (select count(*) from jsonb_array_elements(doc->'blocks') x where x->>'type'='hero' and (x->>'enabled')::boolean)<>1 then raise exception 'Exactly one active hero required' using errcode='22023'; end if;
  for b in select value from jsonb_array_elements(doc->'blocks') loop
    if not (b->>'enabled')::boolean then continue; end if;
    p:=b->'props';
    if b->>'type'<>'text' and coalesce(btrim(p->>'title', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF'),'')='' then raise exception 'Block title required' using errcode='22023'; end if;
    for item in select value from jsonb_array_elements(coalesce(p->'buttons','[]')) loop
      if btrim(item->>'label', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF')='' or btrim(item->>'href', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF')='' then raise exception 'Button label and destination required' using errcode='22023'; end if;
    end loop;
    if coalesce(p#>>'{image,src}','') like '#%' then raise exception 'Image must reference a file' using errcode='22023'; end if;
    if b->>'type'='imageText' and coalesce(btrim(p#>>'{image,src}', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF'),'')='' then raise exception 'Image required' using errcode='22023'; end if;
    if b->>'type' in ('text','imageText') then
      select string_agg(value#>>'{}',' ') into content_text from jsonb_path_query(p->'content','$.** ? (@.type == "text").text') as nodes(value);
      if coalesce(btrim(content_text, E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF'),'')='' then raise exception 'Text required' using errcode='22023'; end if;
    end if;
    if b->>'type'='features' then
      for item in select value from jsonb_array_elements(p->'items') loop
        if btrim(item->>'title', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF')='' or btrim(item->>'description', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF')='' then raise exception 'Feature content required' using errcode='22023'; end if;
      end loop;
    end if;
    if b->>'type'='faq' then
      for item in select value from jsonb_array_elements(p->'items') loop
        if btrim(item->>'question', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF')='' or btrim(item->>'answer', E' \t\n\r\f\u000b\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF')='' then raise exception 'FAQ content required' using errcode='22023'; end if;
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
revoke all on function public.assert_landing_publication(jsonb) from public,anon,authenticated;
commit;
