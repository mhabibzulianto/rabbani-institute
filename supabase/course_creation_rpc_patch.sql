-- Updates the staff_create_course RPC for the dual course model
-- with Madrasah schedule fields and Mandiri defaults.

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
