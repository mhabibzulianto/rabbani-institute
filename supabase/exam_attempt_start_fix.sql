begin;

create or replace function public.exam_start_attempt(
  p_exam_slug text,
  p_access_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  exam_row public.exam_modules%rowtype;
  session_row public.exam_access_sessions%rowtype;
  active_attempt_id uuid;
  attempts_used integer := 0;
  new_attempt_id uuid;
  next_attempt_number integer := 1;
  attempt_expires_at timestamptz;
begin
  select *
  into exam_row
  from public.exam_modules
  where slug = p_exam_slug
    and is_published = true;

  if not found then
    raise exception 'Modul ujian tidak ditemukan';
  end if;

  if now() < exam_row.opens_at then
    raise exception 'Ujian belum dibuka';
  end if;

  if now() > exam_row.closes_at then
    raise exception 'Ujian sudah ditutup';
  end if;

  select *
  into session_row
  from public.exam_access_sessions access_session
  where access_session.exam_id = exam_row.id
    and access_session.session_token = p_access_token
    and access_session.expires_at > now()
  order by access_session.created_at desc
  limit 1;

  if not found then
    raise exception 'Sesi ujian tidak valid';
  end if;

  select attempt.id
  into active_attempt_id
  from public.exam_attempts attempt
  where attempt.exam_id = exam_row.id
    and attempt.participant_phone = session_row.phone
    and attempt.submitted_at is null
    and attempt.expires_at > now()
  order by attempt.created_at desc
  limit 1;

  if active_attempt_id is not null then
    return jsonb_build_object(
      'attempt', public.exam_attempt_json(active_attempt_id),
      'questions', public.exam_question_list(exam_row.id),
      'remaining_attempts', greatest(
        exam_row.max_attempts - (
          select count(*)
          from public.exam_attempts attempt
          where attempt.exam_id = exam_row.id
            and attempt.participant_phone = session_row.phone
        ),
        0
      )
    );
  end if;

  select count(*), coalesce(max(attempt.attempt_number), 0) + 1
  into attempts_used, next_attempt_number
  from public.exam_attempts attempt
  where attempt.exam_id = exam_row.id
    and attempt.participant_phone = session_row.phone;

  if attempts_used >= exam_row.max_attempts then
    raise exception 'Batas attempt untuk ujian ini sudah habis';
  end if;

  attempt_expires_at := least(
    exam_row.closes_at,
    now() + make_interval(mins => exam_row.duration_minutes)
  );

  insert into public.exam_attempts (
    exam_id,
    participant_phone,
    attempt_number,
    expires_at
  )
  values (
    exam_row.id,
    session_row.phone,
    next_attempt_number,
    attempt_expires_at
  )
  returning id
  into new_attempt_id;

  return jsonb_build_object(
    'attempt', public.exam_attempt_json(new_attempt_id),
    'questions', public.exam_question_list(exam_row.id),
    'remaining_attempts', greatest(exam_row.max_attempts - attempts_used - 1, 0)
  );
end;
$$;

grant execute on function public.exam_start_attempt(text, uuid) to anon, authenticated;

commit;
