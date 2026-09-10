begin;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  app_metadata jsonb;
  user_role text;
begin
  select role::text
  into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  app_metadata := coalesce(claims->'app_metadata', '{}'::jsonb);
  app_metadata := jsonb_set(
    app_metadata,
    '{user_role}',
    to_jsonb(coalesce(user_role, 'student'))
  );
  claims := jsonb_set(claims, '{app_metadata}', app_metadata);
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on public.profiles to supabase_auth_admin;

drop policy if exists "Allow auth admin to read profiles for auth hook" on public.profiles;

create policy "Allow auth admin to read profiles for auth hook"
on public.profiles
as permissive
for select
to supabase_auth_admin
using (true);

commit;
