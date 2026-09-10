create table if not exists public.account_app_memberships (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_slug text not null check (app_slug in ('campus', 'store', 'osban')),
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app_slug)
);

create table if not exists public.account_addresses (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  recipient_name text,
  phone_number text,
  address_line1 text,
  address_line2 text,
  city text,
  province text,
  postal_code text,
  country_code text not null default 'ID',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_learning_updates boolean not null default true,
  email_payment_updates boolean not null default true,
  email_security_alerts boolean not null default true,
  whatsapp_learning_updates boolean not null default false,
  whatsapp_payment_updates boolean not null default true,
  whatsapp_security_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists account_app_memberships_set_updated_at on public.account_app_memberships;
create trigger account_app_memberships_set_updated_at
before update on public.account_app_memberships
for each row execute function public.set_updated_at();

drop trigger if exists account_addresses_set_updated_at on public.account_addresses;
create trigger account_addresses_set_updated_at
before update on public.account_addresses
for each row execute function public.set_updated_at();

drop trigger if exists account_notification_preferences_set_updated_at on public.account_notification_preferences;
create trigger account_notification_preferences_set_updated_at
before update on public.account_notification_preferences
for each row execute function public.set_updated_at();

create or replace function public.touch_account_app(target_app text)
returns public.account_app_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  membership public.account_app_memberships;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_app not in ('campus', 'store', 'osban') then
    raise exception 'Unknown app slug';
  end if;

  insert into public.account_app_memberships (user_id, app_slug)
  values (auth.uid(), target_app)
  on conflict (user_id, app_slug) do update
  set last_seen_at = now()
  returning * into membership;

  return membership;
end;
$$;

grant execute on function public.touch_account_app(text) to authenticated;

alter table public.account_app_memberships enable row level security;
alter table public.account_addresses enable row level security;
alter table public.account_notification_preferences enable row level security;

drop policy if exists "Users can manage own app memberships" on public.account_app_memberships;
create policy "Users can manage own app memberships"
on public.account_app_memberships
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage own addresses" on public.account_addresses;
create policy "Users can manage own addresses"
on public.account_addresses
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage own notification preferences" on public.account_notification_preferences;
create policy "Users can manage own notification preferences"
on public.account_notification_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists account_app_memberships_user_idx on public.account_app_memberships(user_id, app_slug);
create index if not exists account_addresses_user_idx on public.account_addresses(user_id, is_primary desc, created_at asc);
