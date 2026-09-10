begin;

alter table public.profiles
  add column if not exists birth_year integer,
  add column if not exists phone_number text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_birth_year_reasonable'
  ) then
    alter table public.profiles
      add constraint profiles_birth_year_reasonable
      check (
        birth_year is null
        or birth_year between 1900 and extract(year from now())::integer
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_phone_number_format'
  ) then
    alter table public.profiles
      add constraint profiles_phone_number_format
      check (
        phone_number is null
        or phone_number ~ '^62[0-9]{8,15}$'
      );
  end if;
end
$$;

create unique index if not exists profiles_phone_number_unique
  on public.profiles (phone_number)
  where phone_number is not null;

create table if not exists public.auth_whatsapp_otps (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  purpose text not null check (purpose in ('signup', 'reset_password')),
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  target_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_whatsapp_otps_phone_purpose_idx
  on public.auth_whatsapp_otps (phone_number, purpose, created_at desc);

create index if not exists auth_whatsapp_otps_expires_idx
  on public.auth_whatsapp_otps (expires_at);

alter table public.auth_whatsapp_otps enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_language public.language_code := 'id';
  requested_birth_year integer := null;
  requested_phone_number text := null;
begin
  if new.raw_user_meta_data ->> 'preferred_language' in ('id', 'ar') then
    requested_language := (new.raw_user_meta_data ->> 'preferred_language')::public.language_code;
  end if;

  if (new.raw_user_meta_data ->> 'birth_year') ~ '^\d{4}$' then
    requested_birth_year := (new.raw_user_meta_data ->> 'birth_year')::integer;
  end if;

  if (new.raw_user_meta_data ->> 'phone_number') ~ '^62[0-9]{8,15}$' then
    requested_phone_number := new.raw_user_meta_data ->> 'phone_number';
  end if;

  insert into public.profiles (id, full_name, preferred_language, birth_year, phone_number)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    requested_language,
    requested_birth_year,
    requested_phone_number
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        preferred_language = excluded.preferred_language,
        birth_year = excluded.birth_year,
        phone_number = coalesce(excluded.phone_number, public.profiles.phone_number);

  return new;
end;
$$;

create or replace function public.auth_email_exists(target_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return exists (
    select 1
    from auth.users
    where lower(email) = lower(target_email)
  );
end;
$$;

grant usage on schema auth to postgres, service_role, supabase_auth_admin;
grant execute on function public.auth_email_exists(text) to anon, authenticated;
revoke all on function public.auth_email_exists(text) from public;
grant execute on function public.auth_email_exists(text) to anon, authenticated;

commit;
