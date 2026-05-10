create table if not exists public.calendar_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google' check (provider in ('google')),
  planner_date date not null,
  tz_offset_minutes integer not null,
  source_calendar_ids text[] not null default '{}'::text[],
  synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider, planner_date, tz_offset_minutes, source_calendar_ids)
);

drop trigger if exists calendar_sync_runs_touch_updated_at on public.calendar_sync_runs;
create trigger calendar_sync_runs_touch_updated_at
before update on public.calendar_sync_runs
for each row
execute function public.touch_updated_at();

create index if not exists calendar_sync_runs_planner_date_idx
  on public.calendar_sync_runs (provider, planner_date);
