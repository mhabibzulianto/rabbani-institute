-- Phase 3. Apply after landing_page_editor_patch.sql. Does not publish anything.
begin;
create table if not exists public.landing_preview_tickets (
  token_hash text primary key, document jsonb not null,
  created_by uuid not null references public.profiles(id), expires_at timestamptz not null
);
create table if not exists public.landing_preview_sessions (
  token_hash text primary key, document jsonb not null,
  created_by uuid not null references public.profiles(id), expires_at timestamptz not null
);
alter table public.landing_preview_tickets enable row level security;
alter table public.landing_preview_sessions enable row level security;
revoke all on public.landing_preview_tickets, public.landing_preview_sessions from public,anon,authenticated;
create or replace function public.create_landing_preview(next_document jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare token text;
begin
  if not public.is_landing_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if not public.valid_landing_document(next_document) then raise exception 'Invalid document' using errcode='22023'; end if;
  delete from public.landing_preview_tickets where expires_at<now();
  delete from public.landing_preview_sessions where expires_at<now();
  if (select count(*) from public.landing_preview_tickets where created_by=auth.uid())>=10 then raise exception 'Too many previews' using errcode='54000'; end if;
  token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into public.landing_preview_tickets values(encode(sha256(convert_to(token,'UTF8')),'hex'),next_document,auth.uid(),now()+interval '2 minutes');
  return token;
end;
$$;
create or replace function public.exchange_landing_preview(ticket text)
returns text language plpgsql security definer set search_path='' as $$
declare t public.landing_preview_tickets; token text;
begin
  if ticket is null or ticket !~ '^[a-f0-9]{64}$' then return null; end if;
  delete from public.landing_preview_tickets where token_hash=encode(sha256(convert_to(ticket,'UTF8')),'hex') returning * into t;
  if not found or t.expires_at<=now() or not exists(select 1 from public.profiles where id=t.created_by and role='admin') then return null; end if;
  token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into public.landing_preview_sessions values(encode(sha256(convert_to(token,'UTF8')),'hex'),t.document,t.created_by,now()+interval '30 minutes');
  return token;
end;
$$;
create or replace function public.read_landing_preview(session_token text)
returns jsonb language sql security definer set search_path='' as $$
  select s.document from public.landing_preview_sessions s
  join public.profiles p on p.id=s.created_by and p.role='admin'
  where session_token ~ '^[a-f0-9]{64}$' and s.token_hash=encode(sha256(convert_to(session_token,'UTF8')),'hex') and s.expires_at>now();
$$;
revoke all on function public.create_landing_preview(jsonb),public.exchange_landing_preview(text),public.read_landing_preview(text) from public,anon,authenticated;
grant execute on function public.create_landing_preview(jsonb) to authenticated;
-- Capability access requires unpredictable short-lived secrets, never a public draft URL.
grant execute on function public.exchange_landing_preview(text),public.read_landing_preview(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
