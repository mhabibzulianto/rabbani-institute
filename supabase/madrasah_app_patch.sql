begin;

alter table public.profiles
  add column if not exists certificate_name text,
  add column if not exists certificate_name_changed_at timestamptz,
  add column if not exists student_number text,
  add column if not exists gender text;

alter table public.profiles
  drop constraint if exists profiles_certificate_name_length,
  drop constraint if exists profiles_student_number_length,
  drop constraint if exists profiles_gender_allowed;

alter table public.profiles
  add constraint profiles_certificate_name_length
    check (certificate_name is null or char_length(certificate_name) between 3 and 160),
  add constraint profiles_student_number_length
    check (student_number is null or char_length(student_number) between 3 and 64),
  add constraint profiles_gender_allowed
    check (gender is null or gender in ('ikhwan', 'akhwat'));

grant update (full_name, avatar_url, bio, preferred_language, birth_year, certificate_name, certificate_name_changed_at, student_number, gender)
  on public.profiles to authenticated;

alter table public.account_app_memberships
  drop constraint if exists account_app_memberships_app_slug_check;

alter table public.account_app_memberships
  add constraint account_app_memberships_app_slug_check
  check (app_slug in ('campus', 'store', 'osban', 'madrasah'));

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

  if target_app not in ('campus', 'store', 'osban', 'madrasah') then
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

create table if not exists public.madrasah_issue_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text,
  title text not null,
  description text not null,
  context_path text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint madrasah_issue_reports_status_allowed check (status in ('open', 'in_review', 'resolved', 'closed'))
);

drop trigger if exists madrasah_issue_reports_set_updated_at on public.madrasah_issue_reports;
create trigger madrasah_issue_reports_set_updated_at
before update on public.madrasah_issue_reports
for each row execute function public.set_updated_at();

alter table public.madrasah_issue_reports enable row level security;

drop policy if exists "Users can create own madrasah issue reports" on public.madrasah_issue_reports;
create policy "Users can create own madrasah issue reports"
on public.madrasah_issue_reports
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can read own madrasah issue reports" on public.madrasah_issue_reports;
create policy "Users can read own madrasah issue reports"
on public.madrasah_issue_reports
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can manage madrasah issue reports" on public.madrasah_issue_reports;
create policy "Admins can manage madrasah issue reports"
on public.madrasah_issue_reports
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

grant select, insert, update on public.madrasah_issue_reports to authenticated;

create index if not exists madrasah_issue_reports_user_idx
  on public.madrasah_issue_reports(user_id, created_at desc);

commit;
