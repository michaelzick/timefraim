-- Track which day a task was marked done on (ties "Done today" to the viewed day)
alter table public.tasks
  add column if not exists completed_on_date date;

-- Backfill existing done tasks using updated_at (best-effort, UTC)
update public.tasks
  set completed_on_date = (updated_at at time zone 'utc')::date
  where status = 'done'
    and completed_on_date is null;

create index if not exists tasks_completed_on_date_idx
  on public.tasks (completed_on_date)
  where status = 'done';
