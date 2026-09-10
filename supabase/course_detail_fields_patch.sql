begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'course_model') then
    create type public.course_model as enum ('madrasah', 'mandiri');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_delivery_mode') then
    create type public.course_delivery_mode as enum ('synchronous', 'asynchronous');
  end if;
end
$$;

alter table public.courses
  add column if not exists course_model public.course_model,
  add column if not exists delivery_mode public.course_delivery_mode,
  add column if not exists enrollment_opens_at timestamptz,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists goals_id text,
  add column if not exists goals_ar text,
  add column if not exists duration_weeks integer;

update public.courses
set course_model = 'mandiri'
where course_model is null;

alter table public.courses
  alter column course_model set default 'mandiri',
  alter column course_model set not null;

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

commit;
