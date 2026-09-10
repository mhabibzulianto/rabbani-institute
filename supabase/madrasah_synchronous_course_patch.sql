begin;

alter table public.courses
  add column if not exists enrollment_closes_at timestamptz,
  add column if not exists session_count integer,
  add column if not exists live_platform text,
  add column if not exists live_meeting_url text;

update public.courses
set enrollment_closes_at = starts_at
where course_model = 'madrasah'
  and enrollment_closes_at is null
  and starts_at is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'course_units'
  ) then
    update public.courses c
    set session_count = counts.total_sessions
    from (
      select course_id, count(*)::integer as total_sessions
      from public.course_units
      group by course_id
    ) counts
    where c.id = counts.course_id
      and c.course_model = 'madrasah'
      and c.delivery_mode = 'synchronous'
      and c.session_count is null;
  elsif exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'lessons'
  ) then
    update public.courses c
    set session_count = counts.total_sessions
    from (
      select course_id, count(*)::integer as total_sessions
      from public.lessons
      group by course_id
    ) counts
    where c.id = counts.course_id
      and c.course_model = 'madrasah'
      and c.delivery_mode = 'synchronous'
      and c.session_count is null;
  end if;
end;
$$;

alter table public.courses
  drop constraint if exists courses_session_count_non_negative,
  drop constraint if exists courses_live_platform_allowed,
  drop constraint if exists courses_enrollment_closes_order;

alter table public.courses
  add constraint courses_session_count_non_negative
  check (session_count is null or session_count >= 1),
  add constraint courses_live_platform_allowed
  check (live_platform is null or live_platform in ('zoom', 'google-meet', 'teams')),
  add constraint courses_enrollment_closes_order
  check (
    enrollment_opens_at is null
    or enrollment_closes_at is null
    or enrollment_opens_at <= enrollment_closes_at
  );

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
  p_enrollment_closes_at timestamptz,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_duration_weeks integer,
  p_session_count integer,
  p_live_platform text,
  p_live_meeting_url text
)
returns bigint
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.user_role;
  resolved_course_model public.course_model := coalesce(p_course_model, 'mandiri'::public.course_model);
  resolved_delivery_mode public.course_delivery_mode := case
    when coalesce(p_course_model, 'mandiri'::public.course_model) = 'madrasah'::public.course_model
      then coalesce(p_delivery_mode, 'synchronous'::public.course_delivery_mode)
    else null
  end;
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
    enrollment_closes_at,
    starts_at,
    ends_at,
    duration_weeks,
    session_count,
    live_platform,
    live_meeting_url
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
    resolved_course_model,
    resolved_delivery_mode,
    case
      when resolved_course_model = 'madrasah'::public.course_model then p_enrollment_opens_at
      else null
    end,
    case
      when resolved_course_model = 'madrasah'::public.course_model then p_enrollment_closes_at
      else null
    end,
    case
      when resolved_course_model = 'madrasah'::public.course_model then p_starts_at
      else null
    end,
    case
      when resolved_course_model = 'madrasah'::public.course_model then p_ends_at
      else null
    end,
    case
      when resolved_course_model = 'madrasah'::public.course_model then greatest(coalesce(p_duration_weeks, 1), 1)
      else null
    end,
    case
      when resolved_course_model = 'madrasah'::public.course_model and resolved_delivery_mode = 'synchronous'::public.course_delivery_mode
        then greatest(coalesce(p_session_count, 1), 1)
      else null
    end,
    case
      when resolved_course_model = 'madrasah'::public.course_model and resolved_delivery_mode = 'synchronous'::public.course_delivery_mode
        then p_live_platform
      else null
    end,
    case
      when resolved_course_model = 'madrasah'::public.course_model and resolved_delivery_mode = 'synchronous'::public.course_delivery_mode
        then p_live_meeting_url
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
  timestamptz,
  integer,
  integer,
  text,
  text
) to authenticated;

commit;
