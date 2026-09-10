begin;

alter table public.lessons
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists recording_url text;

commit;
