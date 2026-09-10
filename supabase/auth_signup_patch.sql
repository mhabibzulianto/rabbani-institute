begin;

alter table public.profiles
  add column if not exists birth_year integer;

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
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_language public.language_code := 'id';
  requested_birth_year integer := null;
begin
  if new.raw_user_meta_data ->> 'preferred_language' in ('id', 'ar') then
    requested_language := (new.raw_user_meta_data ->> 'preferred_language')::public.language_code;
  end if;

  if (new.raw_user_meta_data ->> 'birth_year') ~ '^\d{4}$' then
    requested_birth_year := (new.raw_user_meta_data ->> 'birth_year')::integer;
  end if;

  insert into public.profiles (id, full_name, preferred_language, birth_year)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    requested_language,
    requested_birth_year
  )
  on conflict (id) do nothing;

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
