begin;

create table if not exists public.exam_modules (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  instructions text,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  max_attempts integer not null default 1 check (max_attempts > 0),
  is_published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_modules_schedule_valid check (opens_at < closes_at)
);

create table if not exists public.exam_allowed_phones (
  id bigserial primary key,
  exam_id bigint not null references public.exam_modules (id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now(),
  unique (exam_id, phone)
);

create table if not exists public.exam_questions (
  id bigserial primary key,
  exam_id bigint not null references public.exam_modules (id) on delete cascade,
  sort_order integer not null default 1,
  prompt text not null,
  option_a text not null,
  option_b text not null,
  option_c text,
  option_d text,
  correct_option text not null check (correct_option in ('a', 'b', 'c', 'd')),
  points integer not null default 1 check (points > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_otp_codes (
  id uuid primary key default gen_random_uuid(),
  exam_id bigint not null references public.exam_modules (id) on delete cascade,
  phone text not null,
  code varchar(6) not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create type public.exam_attempt_status as enum ('in_progress', 'submitted');

create table if not exists public.exam_access_sessions (
  id uuid primary key default gen_random_uuid(),
  exam_id bigint not null references public.exam_modules (id) on delete cascade,
  phone text not null,
  session_token uuid not null unique default gen_random_uuid(),
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id bigint not null references public.exam_modules (id) on delete cascade,
  participant_phone text not null,
  attempt_number integer not null,
  status public.exam_attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  score_percent numeric(5,2),
  correct_answers integer,
  total_questions integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, participant_phone, attempt_number)
);

create table if not exists public.exam_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  question_id bigint not null references public.exam_questions (id) on delete cascade,
  selected_option text not null check (selected_option in ('a', 'b', 'c', 'd')),
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists exam_modules_schedule_idx on public.exam_modules (is_published, opens_at, closes_at);
create index if not exists exam_allowed_phones_exam_idx on public.exam_allowed_phones (exam_id);
create index if not exists exam_questions_exam_sort_idx on public.exam_questions (exam_id, sort_order);
create index if not exists exam_otp_codes_lookup_idx on public.exam_otp_codes (exam_id, phone, used, expires_at);
create index if not exists exam_access_sessions_token_idx on public.exam_access_sessions (session_token, exam_id, phone);
create index if not exists exam_attempts_lookup_idx on public.exam_attempts (exam_id, participant_phone, created_at desc);
create index if not exists exam_attempt_answers_attempt_idx on public.exam_attempt_answers (attempt_id);

alter table public.exam_modules enable row level security;
alter table public.exam_allowed_phones enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_otp_codes enable row level security;
alter table public.exam_access_sessions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_answers enable row level security;

drop policy if exists "Public can read published exams" on public.exam_modules;
create policy "Public can read published exams"
on public.exam_modules
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Admins manage exams" on public.exam_modules;
create policy "Admins manage exams"
on public.exam_modules
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

drop policy if exists "Admins manage exam phones" on public.exam_allowed_phones;
create policy "Admins manage exam phones"
on public.exam_allowed_phones
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

drop policy if exists "Public can read published exam questions" on public.exam_questions;
create policy "Public can read published exam questions"
on public.exam_questions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.exam_modules exam
    where exam.id = exam_questions.exam_id
      and exam.is_published = true
  )
);

drop policy if exists "Admins manage exam questions" on public.exam_questions;
create policy "Admins manage exam questions"
on public.exam_questions
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

drop policy if exists "Admins read exam attempts" on public.exam_attempts;
create policy "Admins read exam attempts"
on public.exam_attempts
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

drop policy if exists "Admins read exam answers" on public.exam_attempt_answers;
create policy "Admins read exam answers"
on public.exam_attempt_answers
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

drop policy if exists "Admins read otp codes" on public.exam_otp_codes;
create policy "Admins read otp codes"
on public.exam_otp_codes
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

drop policy if exists "Admins read access sessions" on public.exam_access_sessions;
create policy "Admins read access sessions"
on public.exam_access_sessions
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

create or replace function public.normalize_whatsapp_phone(raw_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  digits text := regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g');
begin
  if digits = '' then
    return '';
  end if;

  if digits like '62%' then
    return digits;
  end if;

  if digits like '0%' then
    return '62' || substring(digits from 2);
  end if;

  if digits like '8%' then
    return '62' || digits;
  end if;

  return digits;
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
        'option_a', q.option_a,
        'option_b', q.option_b,
        'option_c', q.option_c,
        'option_d', q.option_d
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
        'selected_option', answer.selected_option
      )
      order by answer.created_at asc
    ),
    '[]'::jsonb
  )
  from public.exam_attempt_answers answer
  where answer.attempt_id = p_attempt_id;
$$;

create or replace function public.exam_attempt_json(p_attempt_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', attempt.id,
    'attempt_number', attempt.attempt_number,
    'status', attempt.status,
    'started_at', attempt.started_at,
    'expires_at', attempt.expires_at,
    'submitted_at', attempt.submitted_at,
    'answers', public.exam_attempt_answers_json(attempt.id)
  )
  from public.exam_attempts attempt
  where attempt.id = p_attempt_id;
$$;

create or replace function public.exam_request_otp(
  p_exam_slug text,
  p_phone text,
  p_code text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  exam_row public.exam_modules%rowtype;
  normalized_phone text := public.normalize_whatsapp_phone(p_phone);
  whitelist_count integer := 0;
begin
  if normalized_phone = '' then
    raise exception 'Nomor WhatsApp tidak valid';
  end if;

  select *
  into exam_row
  from public.exam_modules
  where slug = p_exam_slug
    and is_published = true;

  if not found then
    raise exception 'Modul ujian tidak ditemukan atau belum dipublikasikan';
  end if;

  if now() < exam_row.opens_at then
    raise exception 'Ujian belum dibuka';
  end if;

  if now() > exam_row.closes_at then
    raise exception 'Ujian sudah ditutup';
  end if;

  select count(*)
  into whitelist_count
  from public.exam_allowed_phones
  where exam_id = exam_row.id;

  if whitelist_count > 0 and not exists (
    select 1
    from public.exam_allowed_phones phone_row
    where phone_row.exam_id = exam_row.id
      and phone_row.phone = normalized_phone
  ) then
    raise exception 'Nomor WhatsApp ini belum terdaftar untuk mengikuti ujian';
  end if;

  delete from public.exam_otp_codes
  where exam_id = exam_row.id
    and phone = normalized_phone;

  insert into public.exam_otp_codes (
    exam_id,
    phone,
    code,
    expires_at
  )
  values (
    exam_row.id,
    normalized_phone,
    p_code,
    p_expires_at
  );

  return jsonb_build_object(
    'success', true,
    'exam_id', exam_row.id,
    'phone', normalized_phone,
    'expires_at', p_expires_at
  );
end;
$$;

create or replace function public.exam_verify_otp(
  p_exam_slug text,
  p_phone text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  exam_row public.exam_modules%rowtype;
  otp_row public.exam_otp_codes%rowtype;
  session_row public.exam_access_sessions%rowtype;
  normalized_phone text := public.normalize_whatsapp_phone(p_phone);
  attempts_used integer := 0;
  session_expiry timestamptz;
begin
  select *
  into exam_row
  from public.exam_modules
  where slug = p_exam_slug
    and is_published = true;

  if not found then
    raise exception 'Modul ujian tidak ditemukan';
  end if;

  select *
  into otp_row
  from public.exam_otp_codes
  where exam_id = exam_row.id
    and phone = normalized_phone
    and code = p_code
    and used = false
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'OTP tidak valid atau sudah kedaluwarsa';
  end if;

  update public.exam_otp_codes
  set used = true
  where id = otp_row.id;

  session_expiry := least(exam_row.closes_at, now() + interval '12 hours');

  insert into public.exam_access_sessions (
    exam_id,
    phone,
    expires_at
  )
  values (
    exam_row.id,
    normalized_phone,
    session_expiry
  )
  returning *
  into session_row;

  select count(*)
  into attempts_used
  from public.exam_attempts attempt
  where attempt.exam_id = exam_row.id
    and attempt.participant_phone = normalized_phone;

  return jsonb_build_object(
    'success', true,
    'access_token', session_row.session_token,
    'phone_display', '+' || normalized_phone,
    'remaining_attempts', greatest(exam_row.max_attempts - attempts_used, 0)
  );
end;
$$;

create or replace function public.exam_get_session(
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
  latest_result record;
  attempts_used integer := 0;
begin
  select *
  into exam_row
  from public.exam_modules
  where slug = p_exam_slug
    and is_published = true;

  if not found then
    raise exception 'Modul ujian tidak ditemukan';
  end if;

  select *
  into session_row
  from public.exam_access_sessions
  where exam_id = exam_row.id
    and session_token = p_access_token
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Sesi ujian tidak valid atau sudah berakhir';
  end if;

  select count(*)
  into attempts_used
  from public.exam_attempts attempt
  where attempt.exam_id = exam_row.id
    and attempt.participant_phone = session_row.phone;

  select attempt.id
  into active_attempt_id
  from public.exam_attempts attempt
  where attempt.exam_id = exam_row.id
    and attempt.participant_phone = session_row.phone
    and attempt.submitted_at is null
    and attempt.expires_at > now()
  order by attempt.created_at desc
  limit 1;

  select
    attempt.attempt_number,
    attempt.score_percent,
    attempt.correct_answers,
    attempt.total_questions,
    attempt.submitted_at
  into latest_result
  from public.exam_attempts attempt
  where attempt.exam_id = exam_row.id
    and attempt.participant_phone = session_row.phone
    and attempt.submitted_at is not null
  order by attempt.submitted_at desc
  limit 1;

  return jsonb_build_object(
    'success', true,
    'phone_display', '+' || session_row.phone,
    'attempts_used', attempts_used,
    'remaining_attempts', greatest(exam_row.max_attempts - attempts_used, 0),
    'active_attempt', case
      when active_attempt_id is not null then public.exam_attempt_json(active_attempt_id)
      else null
    end,
    'latest_result', case
      when latest_result.attempt_number is not null then jsonb_build_object(
        'attempt_number', latest_result.attempt_number,
        'score_percent', latest_result.score_percent,
        'correct_answers', latest_result.correct_answers,
        'total_questions', latest_result.total_questions,
        'submitted_at', latest_result.submitted_at
      )
      else null
    end
  );
end;
$$;

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
  from public.exam_access_sessions
  where exam_id = exam_row.id
    and session_token = p_access_token
    and public.exam_access_sessions.expires_at > now()
  order by created_at desc
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

create or replace function public.exam_save_answer(
  p_attempt_id uuid,
  p_access_token uuid,
  p_question_id bigint,
  p_selected_option text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.exam_attempts%rowtype;
  session_row public.exam_access_sessions%rowtype;
  correct_option text;
begin
  if p_selected_option not in ('a', 'b', 'c', 'd') then
    raise exception 'Pilihan jawaban tidak valid';
  end if;

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

  select question.correct_option
  into correct_option
  from public.exam_questions question
  where question.id = p_question_id
    and question.exam_id = attempt_row.exam_id;

  if correct_option is null then
    raise exception 'Soal ujian tidak ditemukan';
  end if;

  insert into public.exam_attempt_answers (
    attempt_id,
    question_id,
    selected_option,
    is_correct
  )
  values (
    attempt_row.id,
    p_question_id,
    p_selected_option,
    p_selected_option = correct_option
  )
  on conflict (attempt_id, question_id)
  do update
    set selected_option = excluded.selected_option,
        is_correct = excluded.is_correct,
        updated_at = now();

  update public.exam_attempts
  set updated_at = now()
  where id = attempt_row.id;

  return jsonb_build_object('success', true);
end;
$$;

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
  from public.exam_access_sessions
  where session_token = p_access_token
    and exam_id = attempt_row.exam_id
    and phone = attempt_row.participant_phone
  order by created_at desc
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

grant execute on function public.exam_request_otp(text, text, text, timestamptz) to anon, authenticated;
grant execute on function public.exam_verify_otp(text, text, text) to anon, authenticated;
grant execute on function public.exam_get_session(text, uuid) to anon, authenticated;
grant execute on function public.exam_start_attempt(text, uuid) to anon, authenticated;
grant execute on function public.exam_save_answer(uuid, uuid, bigint, text) to anon, authenticated;
grant execute on function public.exam_submit_attempt(uuid, uuid) to anon, authenticated;

drop trigger if exists exam_modules_set_updated_at on public.exam_modules;
create trigger exam_modules_set_updated_at
before update on public.exam_modules
for each row
execute function public.set_updated_at();

drop trigger if exists exam_questions_set_updated_at on public.exam_questions;
create trigger exam_questions_set_updated_at
before update on public.exam_questions
for each row
execute function public.set_updated_at();

drop trigger if exists exam_attempts_set_updated_at on public.exam_attempts;
create trigger exam_attempts_set_updated_at
before update on public.exam_attempts
for each row
execute function public.set_updated_at();

drop trigger if exists exam_attempt_answers_set_updated_at on public.exam_attempt_answers;
create trigger exam_attempt_answers_set_updated_at
before update on public.exam_attempt_answers
for each row
execute function public.set_updated_at();

commit;
