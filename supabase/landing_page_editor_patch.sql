-- Landing editor phase 1. Requires existing profiles + Supabase Auth.
-- Safe to rerun. This patch creates a draft; it does NOT publish a landing page.
begin;

create or replace function public.landing_schema_v1()
returns jsonb language sql immutable set search_path = '' as $$
  select $schema${"root":{"type":"object","properties":{"schemaVersion":{"type":"integer","enum":[1]},"seo":{"ref":"seo"},"blocks":{"type":"array","items":{"ref":"block"},"max":40,"min":1}},"required":["schemaVersion","seo","blocks"]},"definitions":{"seo":{"type":"object","properties":{"title":{"type":"string","max":200},"description":{"type":"string","max":500},"image":{"type":"string","max":2048,"safeUrl":true}},"required":["title","description"]},"button":{"type":"object","properties":{"label":{"type":"string","max":100},"href":{"type":"string","max":2048,"safeUrl":true}},"required":["label","href"]},"media":{"type":"object","properties":{"src":{"type":"string","max":2048,"safeUrl":true},"alt":{"type":"string","max":500},"caption":{"type":"string","max":500}},"required":["src"]},"richDoc":{"type":"object","properties":{"type":{"type":"string","enum":["doc"]},"content":{"type":"array","items":{"ref":"richNode"},"max":500,"min":0}},"required":["type","content"]},"richNode":{"type":"object","properties":{"type":{"type":"string","enum":["paragraph","heading","text","bulletList","orderedList","listItem","hardBreak"]},"text":{"type":"string","max":10000},"content":{"type":"array","items":{"ref":"richNode"},"max":500,"min":0},"attrs":{"type":"object","properties":{"level":{"type":"integer","min":2,"max":4},"start":{"type":"integer","min":1,"max":1000}},"required":[]},"marks":{"type":"array","items":{"ref":"mark"},"max":4,"min":0}},"required":["type"]},"mark":{"type":"object","properties":{"type":{"type":"string","enum":["bold","italic","strike","link"]},"attrs":{"type":"object","properties":{"href":{"type":"string","max":2048,"safeUrl":true}},"required":[]}},"required":["type"]},"block":{"type":"block"}},"blocks":{"hero":{"type":"object","properties":{"label":{"type":"string","max":120},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"buttons":{"type":"array","items":{"ref":"button"},"max":2,"min":0},"image":{"ref":"media"},"imagePosition":{"type":"string","enum":["left","right"]},"variant":{"type":"string","enum":["default","soft"]}},"required":["title"]},"text":{"type":"object","properties":{"title":{"type":"string","max":200},"content":{"ref":"richDoc"}},"required":["content"]},"features":{"type":"object","properties":{"label":{"type":"string","max":120},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"items":{"type":"array","items":{"type":"object","properties":{"icon":{"type":"string","enum":["book","graduation","shield","sparkles","check"]},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"systemValue":{"type":"string","enum":["payment-status"]}},"required":["title","description"]},"max":12,"min":1}},"required":["title","items"]},"imageText":{"type":"object","properties":{"label":{"type":"string","max":120},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"image":{"ref":"media"},"content":{"ref":"richDoc"},"buttons":{"type":"array","items":{"ref":"button"},"max":2,"min":0},"imagePosition":{"type":"string","enum":["left","right"]}},"required":["title","image","content"]},"courses":{"type":"object","properties":{"label":{"type":"string","max":120},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"source":{"type":"string","enum":["latest","selected"]},"limit":{"type":"integer","min":1,"max":12},"selectedIds":{"type":"array","items":{"type":"integer","min":1,"max":2147483647},"max":12,"min":0},"catalogUrl":{"type":"string","max":2048,"safeUrl":true},"catalogLabel":{"type":"string","max":100},"emptyMessage":{"type":"string","max":500}},"required":["title","source","limit","selectedIds"]},"exams":{"type":"object","properties":{"label":{"type":"string","max":120},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"source":{"type":"string","enum":["latest","selected"]},"limit":{"type":"integer","min":1,"max":12},"selectedIds":{"type":"array","items":{"type":"integer","min":1,"max":2147483647},"max":12,"min":0},"catalogUrl":{"type":"string","max":2048,"safeUrl":true},"catalogLabel":{"type":"string","max":100},"emptyMessage":{"type":"string","max":500}},"required":["title","source","limit","selectedIds"]},"articles":{"type":"object","properties":{"label":{"type":"string","max":120},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"source":{"type":"string","enum":["latest","selected"]},"limit":{"type":"integer","min":1,"max":12},"selectedIds":{"type":"array","items":{"type":"integer","min":1,"max":2147483647},"max":12,"min":0},"catalogUrl":{"type":"string","max":2048,"safeUrl":true},"catalogLabel":{"type":"string","max":100},"emptyMessage":{"type":"string","max":500}},"required":["title","source","limit","selectedIds"]},"cta":{"type":"object","properties":{"label":{"type":"string","max":120},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"buttons":{"type":"array","items":{"ref":"button"},"max":2,"min":0},"variant":{"type":"string","enum":["default","soft","dark"]}},"required":["title","buttons"]},"faq":{"type":"object","properties":{"label":{"type":"string","max":120},"title":{"type":"string","max":200},"description":{"type":"string","max":3000},"items":{"type":"array","items":{"type":"object","properties":{"question":{"type":"string","max":300},"answer":{"type":"string","max":5000}},"required":["question","answer"]},"max":30,"min":1}},"required":["title","items"]}}}$schema$::jsonb;
$$;

create or replace function public.landing_value_matches(v jsonb, s jsonb, depth integer default 0)
returns boolean language plpgsql immutable set search_path = '' as $$
declare root jsonb := public.landing_schema_v1(); k text; child jsonb; kind text; n numeric;
begin
  if depth > 16 or v is null then return false; end if;
  if s ? 'ref' then return public.landing_value_matches(v,root->'definitions'->(s->>'ref'),depth); end if;
  kind := s->>'type';
  if kind = 'block' then
    if jsonb_typeof(v) <> 'object' or not ((root->'blocks') ? (v->>'type')) then return false; end if;
    s := jsonb_build_object('type','object','required',jsonb_build_array('id','type','enabled','props'),
      'properties',jsonb_build_object(
        'id',jsonb_build_object('type','string','max',80,'pattern','^[a-zA-Z0-9][a-zA-Z0-9_-]*$'),
        'type',jsonb_build_object('type','string'), 'enabled',jsonb_build_object('type','boolean'),
        'props',root->'blocks'->(v->>'type')));
    kind := 'object';
  end if;
  if s ? 'enum' and not exists(select 1 from jsonb_array_elements(s->'enum') e where e=v) then return false; end if;
  if kind='object' then
    if jsonb_typeof(v)<>'object' then return false; end if;
    for k in select jsonb_array_elements_text(coalesce(s->'required','[]'::jsonb)) loop
      if not (v ? k) then return false; end if;
    end loop;
    for k,child in select * from jsonb_each(v) loop
      if not ((s->'properties') ? k) or not public.landing_value_matches(child,s->'properties'->k,depth+1) then return false; end if;
    end loop;
  elsif kind='array' then
    if jsonb_typeof(v)<>'array' then return false; end if;
    if jsonb_array_length(v)<(s->>'min')::integer or jsonb_array_length(v)>(s->>'max')::integer then return false; end if;
    for child in select jsonb_array_elements(v) loop
      if not public.landing_value_matches(child,s->'items',depth+1) then return false; end if;
    end loop;
  elsif kind='integer' then
    if jsonb_typeof(v)<>'number' then return false; end if;
    n := (v#>>'{}')::numeric;
    if n<>trunc(n) or abs(n)>9007199254740991 or (s ? 'min' and n<(s->>'min')::numeric) or (s ? 'max' and n>(s->>'max')::numeric) then return false; end if;
  elsif kind='string' then
    if jsonb_typeof(v)<>'string' then return false; end if;
    k := v#>>'{}';
    if s ? 'max' and length(k)>(s->>'max')::integer then return false; end if;
    if s ? 'pattern' and k !~ (s->>'pattern') then return false; end if;
    if coalesce((s->>'safeUrl')::boolean,false) and k<>'' then
      if k ~ '[[:space:][:cntrl:]]' or position(chr(92) in k)>0 then return false; end if;
      if not (k ~ '^/([^/]|$)' or k ~ '^#[a-zA-Z][a-zA-Z0-9_-]*$' or k ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#][^[:space:]]*)?$') then return false; end if;
    end if;
  elsif kind='boolean' then
    if jsonb_typeof(v)<>'boolean' then return false; end if;
  else return false;
  end if;
  return true;
end;
$$;

create or replace function public.valid_landing_document(doc jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare total integer; deepest integer; ids integer;
begin
  if doc is null or octet_length(doc::text)>262144 then return false; end if;
  with recursive tree(v,depth) as (
    select doc,0 union all
    select c.v,t.depth+1 from tree t cross join lateral (
      select value as v from jsonb_each(case when jsonb_typeof(t.v)='object' then t.v else '{}'::jsonb end)
      union all select value from jsonb_array_elements(case when jsonb_typeof(t.v)='array' then t.v else '[]'::jsonb end)
    ) c where t.depth<=16
  ) select count(*),max(depth) into total,deepest from tree;
  if total>5000 or deepest>16 then return false; end if;
  if not public.landing_value_matches(doc,public.landing_schema_v1()->'root') then return false; end if;
  select count(distinct b->>'id') into ids from jsonb_array_elements(doc->'blocks') b;
  return ids=jsonb_array_length(doc->'blocks');
end;
$$;

create or replace function public.is_landing_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

create table if not exists public.landing_pages (
  slug text primary key check(slug='home'),
  draft_document jsonb not null check(public.valid_landing_document(draft_document)),
  draft_version bigint not null default 1 check(draft_version>0),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table if not exists public.landing_page_revisions (
  id bigint generated always as identity primary key,
  page_slug text not null references public.landing_pages(slug),
  draft_version bigint not null,
  document jsonb not null check(public.valid_landing_document(document)),
  note text not null default '' check(length(note)<=1000),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(page_slug,draft_version)
);
-- Public access is to a separate table: there is no draft column to leak.
create table if not exists public.landing_page_publications (
  page_slug text primary key references public.landing_pages(slug),
  revision_id bigint not null references public.landing_page_revisions(id),
  document jsonb not null check(public.valid_landing_document(document)),
  published_at timestamptz not null default now()
);

alter table public.landing_pages enable row level security;
alter table public.landing_page_revisions enable row level security;
alter table public.landing_page_publications enable row level security;
revoke all on public.landing_pages,public.landing_page_revisions,public.landing_page_publications from public,anon,authenticated;
revoke all on sequence public.landing_page_revisions_id_seq from public,anon,authenticated;
grant select on public.landing_pages,public.landing_page_revisions to authenticated;
grant select on public.landing_page_publications to anon,authenticated;
drop policy if exists "Landing admins read drafts" on public.landing_pages;
create policy "Landing admins read drafts" on public.landing_pages for select to authenticated using(public.is_landing_admin());
drop policy if exists "Landing admins read revisions" on public.landing_page_revisions;
create policy "Landing admins read revisions" on public.landing_page_revisions for select to authenticated using(public.is_landing_admin());
drop policy if exists "Public reads published landing" on public.landing_page_publications;
create policy "Public reads published landing" on public.landing_page_publications for select to anon,authenticated using(true);

insert into public.landing_pages(slug,draft_document)
values('home',$default${"schemaVersion":1,"seo":{"title":"Rabbani Institute","description":"Platform belajar Al-Qur'an, Bahasa Arab, dan keislaman."},"blocks":[{"id":"beranda","type":"hero","enabled":true,"props":{"label":"Platform belajar online","title":"Al-Qur'an dan Bahasa Arab","description":"Rabbani Institute menghadirkan kelas keislaman, Bahasa Arab, dan kajian bertahap dalam satu ruang belajar yang rapi, tenang, dan mudah diikuti dari mana saja.","buttons":[{"label":"Mulai belajar","href":"https://madrasah.rabbaniinstitute.id/kelas"}],"variant":"default"}},{"id":"tentang","type":"features","enabled":true,"props":{"label":"Tentang platform","title":"Ekosistem belajar yang terasa tenang dan fokus","description":"Kurikulum, evaluasi, dan bahan pendukungnya kami rapikan supaya peserta tinggal belajar dengan lebih nyaman.","items":[{"icon":"book","title":"2 kategori utama","description":"Bahasa Arab dan Ulumul Qur'an kami susun sebagai fondasi perjalanan belajar awal."},{"icon":"graduation","title":"2 model kelas","description":"Kelas Mandiri dan Kelas Madrasah berjalan berdampingan tanpa memecah pengalaman peserta."},{"icon":"shield","title":"SSO siap","description":"Pintu masuk akun bersama Rabbani siap dipakai saat dibutuhkan.","systemValue":"payment-status"}]}},{"id":"kelas","type":"courses","enabled":true,"props":{"label":"Katalog kelas","title":"Kelas unggulan","description":"Pilih kelas, daftar, lalu simpan progress belajar langsung di Supabase.","source":"latest","limit":3,"selectedIds":[],"catalogUrl":"https://madrasah.rabbaniinstitute.id/kelas","catalogLabel":"Lihat semua kelas"}},{"id":"ujian","type":"exams","enabled":true,"props":{"label":"Modul ujian","title":"Ujian yang tersedia","description":"Akses ujian mandiri dan ujian susulan dengan OTP WhatsApp, timer, dan batas attempt yang sudah diatur.","source":"latest","limit":3,"selectedIds":[],"catalogUrl":"/exams","catalogLabel":"Lihat semua ujian","emptyMessage":"Belum ada modul ujian yang dibuka saat ini."}},{"id":"artikel","type":"articles","enabled":true,"props":{"label":"Artikel","title":"Tulisan terbaru","description":"Baca penjelasan, kutipan Arab, dan catatan pembelajaran yang melengkapi kelas-kelas di Rabbani Institute.","source":"latest","limit":3,"selectedIds":[],"catalogUrl":"https://editorial.rabbaniinstitute.id/artikel","catalogLabel":"Buka halaman artikel","emptyMessage":"Belum ada artikel yang terbit saat ini."}},{"id":"mulai","type":"cta","enabled":true,"props":{"label":"Mulai perjalanan Anda","title":"Siap memperdalam pemahaman Al-Qur'an dan Bahasa Arab?","description":"Bergabunglah dengan ribuan pelajar lainnya dan mulai perjalanan Anda dalam memahami kitab suci dengan lebih baik.","variant":"default","buttons":[{"label":"Pilih kelas","href":"https://madrasah.rabbaniinstitute.id/kelas"},{"label":"Hubungi kami","href":"/kontak"}]}}]}$default$::jsonb) on conflict(slug) do nothing;

create or replace function public.save_landing_draft(target_slug text, expected_version bigint, next_document jsonb)
returns public.landing_pages language plpgsql security definer set search_path = '' as $$
declare p public.landing_pages;
begin
  if not public.is_landing_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if not public.valid_landing_document(next_document) then raise exception 'Invalid landing document' using errcode='22023'; end if;
  select * into p from public.landing_pages where slug=target_slug for update;
  if not found then raise exception 'Landing unavailable' using errcode='22023'; end if;
  if expected_version is null or p.draft_version<>expected_version then raise exception 'Landing changed; reload draft' using errcode='40001'; end if;
  update public.landing_pages set draft_document=next_document,draft_version=draft_version+1,updated_by=auth.uid(),updated_at=now()
    where slug=target_slug returning * into p;
  return p;
end;
$$;

-- Foundation primitive. Publication UI/revalidation is implemented in phase 4.
create or replace function public.publish_landing_page(target_slug text, expected_version bigint, revision_note text default '')
returns public.landing_page_publications language plpgsql security definer set search_path = '' as $$
declare p public.landing_pages; r public.landing_page_revisions; published public.landing_page_publications;
begin
  if not public.is_landing_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if revision_note is null or length(revision_note)>1000 then raise exception 'Invalid revision note' using errcode='22023'; end if;
  select * into p from public.landing_pages where slug=target_slug for update;
  if not found then raise exception 'Landing unavailable' using errcode='22023'; end if;
  if expected_version is null or p.draft_version<>expected_version then raise exception 'Landing changed; reload draft' using errcode='40001'; end if;
  if not public.valid_landing_document(p.draft_document) then raise exception 'Invalid landing document' using errcode='22023'; end if;
  insert into public.landing_page_revisions(page_slug,draft_version,document,note,created_by)
    values(p.slug,p.draft_version,p.draft_document,revision_note,auth.uid()) on conflict(page_slug,draft_version) do nothing;
  select * into r from public.landing_page_revisions where page_slug=p.slug and draft_version=p.draft_version;
  insert into public.landing_page_publications(page_slug,revision_id,document,published_at)
    values(p.slug,r.id,r.document,r.created_at) on conflict(page_slug) do update
    set revision_id=excluded.revision_id,document=excluded.document,published_at=excluded.published_at returning * into published;
  return published;
end;
$$;

revoke all on function public.landing_schema_v1(),public.landing_value_matches(jsonb,jsonb,integer),public.valid_landing_document(jsonb),public.is_landing_admin(),public.save_landing_draft(text,bigint,jsonb),public.publish_landing_page(text,bigint,text) from public,anon,authenticated;
grant execute on function public.is_landing_admin(),public.save_landing_draft(text,bigint,jsonb),public.publish_landing_page(text,bigint,text) to authenticated;
notify pgrst,'reload schema';
commit;
