-- Dual course model migration for Rabbani Institute
-- Introduces:
-- - Kelas Madrasah (scheduled) with enrollment open date, start date, end date
-- - Kelas Mandiri (on-demand)
-- - course_units / course_unit_progress replacing lessons / lesson_progress
-- - automatic duration sync from units
-- - updated course creation RPC and staff access policies

begin;

create or replace function private.is_enrolled_in_course(target_course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.course_id = target_course_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  );
$$;

create or replace function private.is_course_published(target_course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses c
    where c.id = target_course_id
      and c.status = 'published'
  );
$$;

grant execute on function private.is_enrolled_in_course(bigint) to authenticated;
grant execute on function private.is_course_published(bigint) to authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'course_model') then
    create type public.course_model as enum ('madrasah', 'mandiri');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_delivery_mode') then
    create type public.course_delivery_mode as enum ('synchronous', 'asynchronous');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_unit_kind') then
    create type public.course_unit_kind as enum ('session', 'module');
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'lesson_content_type'
      and e.enumlabel = 'meeting'
  ) is false then
    alter type public.lesson_content_type add value 'meeting';
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'lesson_content_type'
      and e.enumlabel = 'recording'
  ) is false then
    alter type public.lesson_content_type add value 'recording';
  end if;
end
$$;

alter table public.courses
  add column if not exists course_model public.course_model not null default 'mandiri',
  add column if not exists delivery_mode public.course_delivery_mode,
  add column if not exists goals_id text,
  add column if not exists goals_ar text,
  add column if not exists duration_weeks integer,
  add column if not exists enrollment_opens_at timestamptz,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

update public.courses
set course_model = 'mandiri'
where course_model is null;

drop policy if exists "Students can read enrolled courses" on public.courses;
drop policy if exists "Admins can read all courses" on public.courses;
drop policy if exists "Instructors can read own courses" on public.courses;
drop policy if exists "Course owners and admins can update courses" on public.courses;
drop policy if exists "Admins can delete courses" on public.courses;

create policy "Students can read enrolled courses"
on public.courses
for select
to authenticated
using ((select private.is_enrolled_in_course(id)));

create policy "Admins can read all courses"
on public.courses
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "Instructors can read own courses"
on public.courses
for select
to authenticated
using (instructor_id = auth.uid());

create policy "Course owners and admins can update courses"
on public.courses
for update
to authenticated
using (
  instructor_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  (
    instructor_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'instructor'
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "Admins can delete courses"
on public.courses
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'lessons'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'course_units'
  ) then
    alter table public.lessons rename to course_units;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'lesson_progress'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'course_unit_progress'
  ) then
    alter table public.lesson_progress rename to course_unit_progress;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'course_unit_progress'
      and column_name = 'lesson_id'
  ) then
    alter table public.course_unit_progress rename column lesson_id to unit_id;
  end if;
end
$$;

alter table public.course_units
  add column if not exists unit_kind public.course_unit_kind not null default 'module',
  add column if not exists meeting_url text,
  add column if not exists meeting_platform text,
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists recording_url text;

update public.course_units
set unit_kind = 'module'
where unit_kind is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_duration_weeks_non_negative'
  ) then
    alter table public.courses
      add constraint courses_duration_weeks_non_negative
      check (duration_weeks is null or duration_weeks >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'courses_madrasah_duration_required'
  ) then
    alter table public.courses
      add constraint courses_madrasah_duration_required
      check (
        course_model <> 'madrasah'
        or duration_weeks is not null
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'courses_madrasah_delivery_required'
  ) then
    alter table public.courses
      add constraint courses_madrasah_delivery_required
      check (
        course_model <> 'madrasah'
        or delivery_mode is not null
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'courses_madrasah_schedule_required'
  ) then
    alter table public.courses
      add constraint courses_madrasah_schedule_required
      check (
        course_model <> 'madrasah'
        or (
          enrollment_opens_at is not null
          and starts_at is not null
          and ends_at is not null
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'courses_madrasah_schedule_order'
  ) then
    alter table public.courses
      add constraint courses_madrasah_schedule_order
      check (
        course_model <> 'madrasah'
        or (
          enrollment_opens_at <= starts_at
          and starts_at < ends_at
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'courses_mandiri_duration_null'
  ) then
    alter table public.courses
      add constraint courses_mandiri_duration_null
      check (
        course_model <> 'mandiri'
        or duration_weeks is null
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'courses_mandiri_delivery_null'
  ) then
    alter table public.courses
      add constraint courses_mandiri_delivery_null
      check (
        course_model <> 'mandiri'
        or delivery_mode is null
      );
  end if;
end
$$;

create or replace function public.sync_course_duration(target_course_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.courses
  set duration_minutes = coalesce(
    (
      select sum(cu.duration_minutes)
      from public.course_units cu
      where cu.course_id = target_course_id
    ),
    0
  )
  where id = target_course_id;
end;
$$;

create or replace function public.handle_course_unit_duration_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_course_duration(old.course_id);
    return old;
  end if;

  perform public.sync_course_duration(new.course_id);

  if tg_op = 'UPDATE' and old.course_id is distinct from new.course_id then
    perform public.sync_course_duration(old.course_id);
  end if;

  return new;
end;
$$;

drop trigger if exists course_units_sync_course_duration on public.course_units;

create trigger course_units_sync_course_duration
after insert or update or delete on public.course_units
for each row execute function public.handle_course_unit_duration_sync();

create or replace function public.staff_create_course(
  p_category_id bigint,
  p_instructor_id uuid,
  p_slug text,
  p_status public.course_status,
  p_review_status public.course_review_status,
  p_title_id text,
  p_title_ar text,
  p_short_description_id text,
  p_short_description_ar text,
  p_description_id text,
  p_description_ar text,
  p_goals_id text,
  p_goals_ar text,
  p_level text,
  p_thumbnail_url text,
  p_featured boolean,
  p_published_at timestamptz,
  p_review_submitted_at timestamptz,
  p_last_reviewed_at timestamptz,
  p_course_model public.course_model,
  p_delivery_mode public.course_delivery_mode,
  p_enrollment_opens_at timestamptz,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_duration_weeks integer
)
returns bigint
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.user_role;
  new_course_id bigint;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select p.role
  into actor_role
  from public.profiles p
  where p.id = actor_id;

  if actor_role not in ('admin', 'instructor') then
    raise exception 'Only admins and instructors can create courses';
  end if;

  insert into public.courses (
    category_id,
    instructor_id,
    slug,
    status,
    review_status,
    title_id,
    title_ar,
    short_description_id,
    short_description_ar,
    description_id,
    description_ar,
    goals_id,
    goals_ar,
    level,
    thumbnail_url,
    featured,
    published_at,
    review_submitted_at,
    last_reviewed_at,
    course_model,
    delivery_mode,
    enrollment_opens_at,
    starts_at,
    ends_at,
    duration_weeks
  )
  values (
    p_category_id,
    case when actor_role = 'admin' then coalesce(p_instructor_id, actor_id) else actor_id end,
    p_slug,
    case
      when actor_role = 'admin' then coalesce(p_status, 'draft'::public.course_status)
      else 'draft'::public.course_status
    end,
    case
      when actor_role = 'admin' then coalesce(
        p_review_status,
        case
          when p_status = 'published'::public.course_status then 'approved'::public.course_review_status
          else 'draft'::public.course_review_status
        end
      )
      else 'draft'::public.course_review_status
    end,
    p_title_id,
    p_title_ar,
    p_short_description_id,
    p_short_description_ar,
    p_description_id,
    p_description_ar,
    p_goals_id,
    p_goals_ar,
    coalesce(nullif(trim(p_level), ''), 'Pemula'),
    p_thumbnail_url,
    case when actor_role = 'admin' then coalesce(p_featured, false) else false end,
    case when actor_role = 'admin' then p_published_at else null end,
    case when actor_role = 'admin' then p_review_submitted_at else null end,
    case when actor_role = 'admin' then p_last_reviewed_at else null end,
    coalesce(p_course_model, 'mandiri'::public.course_model),
    case
      when coalesce(p_course_model, 'mandiri'::public.course_model) = 'madrasah'::public.course_model
        then coalesce(p_delivery_mode, 'synchronous'::public.course_delivery_mode)
      else null
    end,
    case
      when coalesce(p_course_model, 'mandiri'::public.course_model) = 'madrasah'::public.course_model
        then p_enrollment_opens_at
      else null
    end,
    case
      when coalesce(p_course_model, 'mandiri'::public.course_model) = 'madrasah'::public.course_model
        then p_starts_at
      else null
    end,
    case
      when coalesce(p_course_model, 'mandiri'::public.course_model) = 'madrasah'::public.course_model
        then p_ends_at
      else null
    end,
    case
      when coalesce(p_course_model, 'mandiri'::public.course_model) = 'madrasah'::public.course_model
        then greatest(coalesce(p_duration_weeks, 1), 1)
      else null
    end
  )
  returning id into new_course_id;

  return new_course_id;
end;
$$;

grant execute on function public.staff_create_course(
  bigint,
  uuid,
  text,
  public.course_status,
  public.course_review_status,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  timestamptz,
  timestamptz,
  timestamptz,
  public.course_model,
  public.course_delivery_mode,
  timestamptz,
  timestamptz,
  timestamptz,
  integer
) to authenticated;

drop policy if exists "Course owners and admins can read review events" on public.course_review_events;
drop policy if exists "Course owners and admins can create review events" on public.course_review_events;

create policy "Course owners and admins can read review events"
on public.course_review_events
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_review_events.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

create policy "Course owners and admins can create review events"
on public.course_review_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_review_events.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "Public can read lessons for published courses" on public.course_units;
drop policy if exists "Students can read lessons for enrolled courses" on public.course_units;
drop policy if exists "Course owners and admins can manage lessons" on public.course_units;

create policy "Public can read units for published courses"
on public.course_units
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_units.course_id
      and c.status = 'published'
  )
);

create policy "Students can read units for enrolled courses"
on public.course_units
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments e
    where e.course_id = course_units.course_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  )
);

create policy "Course owners and admins can manage units"
on public.course_units
for all
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_units.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_units.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "Users can read their own lesson progress" on public.course_unit_progress;
drop policy if exists "Course owners and admins can read lesson progress" on public.course_unit_progress;
drop policy if exists "Users can create progress for enrolled lessons" on public.course_unit_progress;
drop policy if exists "Users can update their own lesson progress" on public.course_unit_progress;
drop policy if exists "Admins can delete lesson progress" on public.course_unit_progress;

create policy "Users can read their own unit progress"
on public.course_unit_progress
for select
to authenticated
using (student_id = auth.uid());

create policy "Course owners and admins can read unit progress"
on public.course_unit_progress
for select
to authenticated
using (
  exists (
    select 1
    from public.course_units cu
    join public.courses c on c.id = cu.course_id
    where cu.id = course_unit_progress.unit_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

create policy "Users can create progress for enrolled units"
on public.course_unit_progress
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.course_units cu
    join public.enrollments e on e.course_id = cu.course_id
    where cu.id = course_unit_progress.unit_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  )
);

create policy "Users can update their own unit progress"
on public.course_unit_progress
for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "Admins can delete unit progress"
on public.course_unit_progress
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

grant select on public.course_units to anon, authenticated;
grant insert, update, delete on public.course_units to authenticated;
grant select, insert, update, delete on public.course_unit_progress to authenticated;

drop policy if exists "Users can enroll themselves in published courses" on public.enrollments;

create policy "Users can enroll themselves in published courses"
on public.enrollments
for insert
to authenticated
with check (
  student_id = auth.uid()
  and (select private.is_course_published(course_id))
);

commit;
