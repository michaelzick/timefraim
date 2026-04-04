create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  estimated_minutes integer not null default 30 check (estimated_minutes > 0 and estimated_minutes <= 720),
  status text not null default 'inbox' check (status in ('inbox', 'planned', 'scheduled', 'in_progress', 'done', 'archived')),
  scheduled_block_id uuid,
  toggl_project_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual', 'ai', 'sync')),
  state text not null default 'confirmed' check (state in ('draft', 'confirmed', 'sync_pending', 'synced', 'failed', 'cancelled')),
  google_event_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_at > start_at)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google',
  external_event_id text not null,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_app_managed boolean not null default false,
  schedule_block_id uuid references public.schedule_blocks (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider, external_event_id)
);

create table if not exists public.integration_tokens (
  provider text primary key,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sync_drafts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('task.create', 'task.update', 'schedule_block.create', 'schedule_block.update', 'schedule_block.delete', 'timer.start', 'timer.stop')),
  payload jsonb not null default '{}'::jsonb,
  diff_summary text not null,
  status text not null default 'pending' check (status in ('pending', 'applied', 'rejected', 'expired')),
  actor_role text not null default 'user' check (actor_role in ('user', 'assistant', 'system')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  applied_at timestamptz,
  rejected_at timestamptz
);

create table if not exists public.timer_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  toggl_entry_id text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  source text not null default 'manual' check (source in ('manual', 'ai', 'sync')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_role text not null check (actor_role in ('user', 'assistant', 'system')),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  diff_summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
before update on public.tasks
for each row
execute function public.touch_updated_at();

drop trigger if exists schedule_blocks_touch_updated_at on public.schedule_blocks;
create trigger schedule_blocks_touch_updated_at
before update on public.schedule_blocks
for each row
execute function public.touch_updated_at();

drop trigger if exists calendar_events_touch_updated_at on public.calendar_events;
create trigger calendar_events_touch_updated_at
before update on public.calendar_events
for each row
execute function public.touch_updated_at();

drop trigger if exists integration_tokens_touch_updated_at on public.integration_tokens;
create trigger integration_tokens_touch_updated_at
before update on public.integration_tokens
for each row
execute function public.touch_updated_at();

create index if not exists schedule_blocks_time_idx on public.schedule_blocks (start_at, end_at);
create index if not exists calendar_events_time_idx on public.calendar_events (start_at, end_at);
create index if not exists sync_drafts_status_idx on public.sync_drafts (status, expires_at);
create index if not exists timer_sessions_active_idx on public.timer_sessions (ended_at);
