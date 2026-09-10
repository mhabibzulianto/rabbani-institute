begin;

create or replace function public.exam_submit_attempt(
  p_attempt_id uuid,
  p_access_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.exam_attempts%rowtype;
  session_row public.exam_access_sessions%rowtype;
  exam_row public.exam_modules%rowtype;
  total_question_count integer := 0;
  correct_answer_count integer := 0;
  computed_score_percent numeric(5,2) := 0;
  attempts_used integer := 0;
begin
  select *
  into attempt_row
  from public.exam_attempts
  where id = p_attempt_id;

  if not found then
    raise exception 'Attempt ujian tidak ditemukan';
  end if;

  select *
  into session_row
  from public.exam_access_sessions access_session
  where access_session.session_token = p_access_token
    and access_session.exam_id = attempt_row.exam_id
    and access_session.phone = attempt_row.participant_phone
  order by access_session.created_at desc
  limit 1;

  if not found then
    raise exception 'Sesi ujian tidak valid';
  end if;

  if attempt_row.submitted_at is not null then
    raise exception 'Attempt ini sudah dikirim sebelumnya';
  end if;

  select *
  into exam_row
  from public.exam_modules
  where id = attempt_row.exam_id;

  select count(*)
  into total_question_count
  from public.exam_questions question
  where question.exam_id = attempt_row.exam_id;

  select count(*)
  into correct_answer_count
  from public.exam_attempt_answers answer
  where answer.attempt_id = attempt_row.id
    and answer.is_correct = true;

  if total_question_count > 0 then
    computed_score_percent := round((correct_answer_count::numeric / total_question_count::numeric) * 100, 2);
  end if;

  update public.exam_attempts
  set
    submitted_at = now(),
    status = 'submitted',
    score_percent = computed_score_percent,
    correct_answers = correct_answer_count,
    total_questions = total_question_count,
    updated_at = now()
  where id = attempt_row.id;

  select count(*)
  into attempts_used
  from public.exam_attempts attempt
  where attempt.exam_id = attempt_row.exam_id
    and attempt.participant_phone = attempt_row.participant_phone;

  return jsonb_build_object(
    'success', true,
    'remaining_attempts', greatest(exam_row.max_attempts - attempts_used, 0),
    'result', jsonb_build_object(
      'attempt_number', attempt_row.attempt_number,
      'score_percent', computed_score_percent,
      'correct_answers', correct_answer_count,
      'total_questions', total_question_count,
      'submitted_at', now()
    )
  );
end;
$$;

grant execute on function public.exam_submit_attempt(uuid, uuid) to anon, authenticated;

commit;
