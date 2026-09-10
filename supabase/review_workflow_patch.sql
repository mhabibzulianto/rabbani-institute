-- Apply this patch to an existing Rabbani Institute database to add:
-- 1. Teacher review workflow
-- 2. Admin approval/request-changes notes
-- 3. Review history log

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'course_review_status'
  ) then
    create type public.course_review_status as enum ('draft', 'in_review', 'changes_requested', 'approved');
  end if;
end
$$;

alter table public.courses
  add column if not exists review_status public.course_review_status not null default 'draft',
  add column if not exists review_submitted_at timestamptz,
  add column if not exists last_reviewed_at timestamptz;

create table if not exists public.course_review_events (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint course_review_events_action_check check (
    action in ('created', 'submitted', 'approved', 'changes_requested', 'updated')
  )
);

create index if not exists courses_review_status_idx on public.courses(review_status, updated_at desc);
create index if not exists course_review_events_course_idx on public.course_review_events(course_id, created_at desc);

create or replace function public.enforce_course_approval()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_role public.user_role := private.current_user_role();
begin
  if actor_role <> 'admin' then
    new.instructor_id := (select auth.uid());
    new.status := 'draft';
    if tg_op = 'INSERT' then
      new.review_status := 'draft';
    elsif old.review_status = 'approved' or old.status = 'published' then
      new.review_status := 'draft';
    end if;
    new.featured := false;
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists courses_enforce_course_approval on public.courses;

create trigger courses_enforce_course_approval
before insert or update on public.courses
for each row execute function public.enforce_course_approval();

alter table public.course_review_events enable row level security;

drop policy if exists "Course owners and admins can read review events" on public.course_review_events;
create policy "Course owners and admins can read review events"
on public.course_review_events
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_review_events.course_id
      and (c.instructor_id = (select auth.uid()) or (select private.is_admin()))
  )
);

drop policy if exists "Course owners and admins can create review events" on public.course_review_events;
create policy "Course owners and admins can create review events"
on public.course_review_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_review_events.course_id
      and (c.instructor_id = (select auth.uid()) or (select private.is_admin()))
  )
);

grant select on public.course_review_events to authenticated;
grant insert on public.course_review_events to authenticated;
