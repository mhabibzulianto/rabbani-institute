begin;

alter table public.exam_questions
  add column if not exists question_type text not null default 'single_choice',
  add column if not exists option_list jsonb not null default '[]'::jsonb,
  add column if not exists grid_rows jsonb not null default '[]'::jsonb,
  add column if not exists grid_columns jsonb not null default '[]'::jsonb,
  add column if not exists answer_key jsonb;

alter table public.exam_questions
  drop constraint if exists exam_questions_question_type_check;

alter table public.exam_questions
  add constraint exam_questions_question_type_check
  check (question_type in ('single_choice', 'multiple_choice', 'grid_single'));

alter table public.exam_questions
  alter column correct_option drop not null;

alter table public.exam_questions
  alter column option_a drop not null,
  alter column option_b drop not null;

alter table public.exam_attempt_answers
  add column if not exists selected_payload jsonb;

update public.exam_questions
set
  option_list = case
    when jsonb_array_length(option_list) = 0 then to_jsonb(
      array_remove(array[
        jsonb_build_object('key', 'a', 'label', option_a),
        jsonb_build_object('key', 'b', 'label', option_b),
        case when option_c is not null then jsonb_build_object('key', 'c', 'label', option_c) end,
        case when option_d is not null then jsonb_build_object('key', 'd', 'label', option_d) end
      ], null)
    )
    else option_list
  end,
  answer_key = case
    when answer_key is null and correct_option is not null then to_jsonb(correct_option)
    else answer_key
  end
where question_type = 'single_choice';

update public.exam_attempt_answers
set selected_payload = to_jsonb(selected_option)
where selected_payload is null
  and selected_option is not null;

create or replace function public.normalize_exam_response(p_response jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when p_response is null then null
    when jsonb_typeof(p_response) = 'array' then (
      select jsonb_agg(value order by value)
      from jsonb_array_elements_text(p_response) as item(value)
    )
    else p_response
  end;
$$;

create or replace function public.exam_question_list(p_exam_id bigint)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'sort_order', q.sort_order,
        'prompt', q.prompt,
        'points', q.points,
        'question_type', q.question_type,
        'option_list', q.option_list,
        'grid_rows', q.grid_rows,
        'grid_columns', q.grid_columns
      )
      order by q.sort_order, q.id
    ),
    '[]'::jsonb
  )
  from public.exam_questions q
  where q.exam_id = p_exam_id;
$$;

create or replace function public.exam_attempt_answers_json(p_attempt_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', answer.question_id,
        'selected_option', coalesce(answer.selected_payload, to_jsonb(answer.selected_option))
      )
      order by answer.created_at asc
    ),
    '[]'::jsonb
  )
  from public.exam_attempt_answers answer
  where answer.attempt_id = p_attempt_id;
$$;

drop function if exists public.exam_save_answer(uuid, uuid, bigint, text);

create or replace function public.exam_save_answer(
  p_attempt_id uuid,
  p_access_token uuid,
  p_question_id bigint,
  p_response jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.exam_attempts%rowtype;
  session_row public.exam_access_sessions%rowtype;
  question_row public.exam_questions%rowtype;
  is_correct boolean := false;
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
  from public.exam_access_sessions
  where session_token = p_access_token
    and exam_id = attempt_row.exam_id
    and phone = attempt_row.participant_phone
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Sesi ujian tidak valid';
  end if;

  if attempt_row.submitted_at is not null or attempt_row.expires_at <= now() then
    raise exception 'Attempt ini sudah berakhir';
  end if;

  select *
  into question_row
  from public.exam_questions question
  where question.id = p_question_id
    and question.exam_id = attempt_row.exam_id;

  if not found then
    raise exception 'Soal ujian tidak ditemukan';
  end if;

  if question_row.answer_key is not null then
    is_correct := public.normalize_exam_response(question_row.answer_key) = public.normalize_exam_response(p_response);
  end if;

  insert into public.exam_attempt_answers (
    attempt_id,
    question_id,
    selected_option,
    selected_payload,
    is_correct
  )
  values (
    attempt_row.id,
    p_question_id,
    case when jsonb_typeof(p_response) = 'string' then trim(both '"' from p_response::text) else null end,
    p_response,
    is_correct
  )
  on conflict (attempt_id, question_id)
  do update
    set selected_option = excluded.selected_option,
        selected_payload = excluded.selected_payload,
        is_correct = excluded.is_correct,
        updated_at = now();

  update public.exam_attempts
  set updated_at = now()
  where id = attempt_row.id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.exam_save_answer(uuid, uuid, bigint, jsonb) to anon, authenticated;

commit;
