begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-files',
  'course-files',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'application/rtf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.course_documents (
  id bigserial primary key,
  course_id bigint not null references public.courses (id) on delete cascade,
  unit_sort_order integer,
  title text not null,
  file_name text not null,
  bucket_id text not null default 'course-files',
  storage_path text not null unique,
  mime_type text,
  file_size_bytes bigint,
  sort_order integer not null default 1,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_quizzes (
  id bigserial primary key,
  course_id bigint not null references public.courses (id) on delete cascade,
  placement_after_sort_order integer not null default 0,
  title_id text not null,
  title_ar text,
  instructions_id text,
  instructions_ar text,
  max_attempts integer not null default 1 check (max_attempts > 0),
  is_published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_quiz_questions (
  id bigserial primary key,
  quiz_id bigint not null references public.course_quizzes (id) on delete cascade,
  sort_order integer not null default 1,
  prompt text not null,
  question_type text not null default 'single_choice'
    check (question_type in ('single_choice', 'multiple_choice', 'grid_single')),
  option_list jsonb not null default '[]'::jsonb,
  grid_rows jsonb not null default '[]'::jsonb,
  grid_columns jsonb not null default '[]'::jsonb,
  answer_key jsonb,
  points integer not null default 1 check (points > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id bigint not null references public.course_quizzes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  attempt_number integer not null,
  submitted_at timestamptz not null default now(),
  score_percent numeric(5,2),
  correct_answers integer not null default 0,
  total_questions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, student_id, attempt_number)
);

create table if not exists public.course_quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.course_quiz_attempts (id) on delete cascade,
  question_id bigint not null references public.course_quiz_questions (id) on delete cascade,
  response jsonb,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists course_documents_course_idx
  on public.course_documents (course_id, unit_sort_order, sort_order);

create index if not exists course_quizzes_course_idx
  on public.course_quizzes (course_id, placement_after_sort_order, created_at);

create index if not exists course_quiz_questions_quiz_idx
  on public.course_quiz_questions (quiz_id, sort_order);

create index if not exists course_quiz_attempts_quiz_student_idx
  on public.course_quiz_attempts (quiz_id, student_id, created_at desc);

create index if not exists course_quiz_attempt_answers_attempt_idx
  on public.course_quiz_attempt_answers (attempt_id);

alter table public.course_documents enable row level security;
alter table public.course_quizzes enable row level security;
alter table public.course_quiz_questions enable row level security;
alter table public.course_quiz_attempts enable row level security;
alter table public.course_quiz_attempt_answers enable row level security;

drop policy if exists "Authenticated can read published course documents" on public.course_documents;
create policy "Authenticated can read published course documents"
on public.course_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_documents.course_id
      and (
        c.status = 'published'
        or c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "Staff manage course documents" on public.course_documents;
create policy "Staff manage course documents"
on public.course_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_documents.course_id
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
    where c.id = course_documents.course_id
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

drop policy if exists "Authenticated can read published course quizzes" on public.course_quizzes;
create policy "Authenticated can read published course quizzes"
on public.course_quizzes
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_quizzes.course_id
      and (
        (c.status = 'published' and course_quizzes.is_published = true)
        or c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "Staff manage course quizzes" on public.course_quizzes;
create policy "Staff manage course quizzes"
on public.course_quizzes
for all
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_quizzes.course_id
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
    where c.id = course_quizzes.course_id
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

drop policy if exists "Authenticated can read published course quiz questions" on public.course_quiz_questions;
create policy "Authenticated can read published course quiz questions"
on public.course_quiz_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.course_quizzes quiz
    join public.courses c on c.id = quiz.course_id
    where quiz.id = course_quiz_questions.quiz_id
      and (
        (quiz.is_published = true and c.status = 'published')
        or c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "Staff manage course quiz questions" on public.course_quiz_questions;
create policy "Staff manage course quiz questions"
on public.course_quiz_questions
for all
to authenticated
using (
  exists (
    select 1
    from public.course_quizzes quiz
    join public.courses c on c.id = quiz.course_id
    where quiz.id = course_quiz_questions.quiz_id
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
    from public.course_quizzes quiz
    join public.courses c on c.id = quiz.course_id
    where quiz.id = course_quiz_questions.quiz_id
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

drop policy if exists "Admins read quiz attempts" on public.course_quiz_attempts;
create policy "Admins read quiz attempts"
on public.course_quiz_attempts
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

drop policy if exists "Staff read owned quiz attempts" on public.course_quiz_attempts;
create policy "Staff read owned quiz attempts"
on public.course_quiz_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.course_quizzes quiz
    join public.courses c on c.id = quiz.course_id
    where quiz.id = course_quiz_attempts.quiz_id
      and c.instructor_id = auth.uid()
  )
);

drop policy if exists "Admins read quiz answers" on public.course_quiz_attempt_answers;
create policy "Admins read quiz answers"
on public.course_quiz_attempt_answers
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

drop policy if exists "Staff read owned quiz answers" on public.course_quiz_attempt_answers;
create policy "Staff read owned quiz answers"
on public.course_quiz_attempt_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.course_quiz_attempts attempt
    join public.course_quizzes quiz on quiz.id = attempt.quiz_id
    join public.courses c on c.id = quiz.course_id
    where attempt.id = course_quiz_attempt_answers.attempt_id
      and c.instructor_id = auth.uid()
  )
);

drop trigger if exists course_documents_set_updated_at on public.course_documents;
create trigger course_documents_set_updated_at
before update on public.course_documents
for each row
execute function public.set_updated_at();

drop trigger if exists course_quizzes_set_updated_at on public.course_quizzes;
create trigger course_quizzes_set_updated_at
before update on public.course_quizzes
for each row
execute function public.set_updated_at();

drop trigger if exists course_quiz_questions_set_updated_at on public.course_quiz_questions;
create trigger course_quiz_questions_set_updated_at
before update on public.course_quiz_questions
for each row
execute function public.set_updated_at();

drop trigger if exists course_quiz_attempts_set_updated_at on public.course_quiz_attempts;
create trigger course_quiz_attempts_set_updated_at
before update on public.course_quiz_attempts
for each row
execute function public.set_updated_at();

drop trigger if exists course_quiz_attempt_answers_set_updated_at on public.course_quiz_attempt_answers;
create trigger course_quiz_attempt_answers_set_updated_at
before update on public.course_quiz_attempt_answers
for each row
execute function public.set_updated_at();

commit;
