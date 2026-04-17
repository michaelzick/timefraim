-- Add source calendar tracking to calendar_events
alter table public.calendar_events
  add column if not exists source_calendar_id text,
  add column if not exists source_calendar_name text;

-- Add calendar_event_id to timer_sessions for event-backed timers
alter table public.timer_sessions
  alter column task_id drop not null,
  add column if not exists calendar_event_id uuid references public.calendar_events(id) on delete set null;

-- Exactly one timer target must be set (task or calendar event, not both, not neither)
alter table public.timer_sessions
  add constraint timer_sessions_exactly_one_target
    check (
      (task_id is not null and calendar_event_id is null)
      or (task_id is null and calendar_event_id is not null)
    );

-- Add sync_calendar_ids to integration_tokens metadata (handled at app level, not schema)
-- The metadata jsonb column already supports this.

-- Update the draft kind enum to include timer.start_event
alter table public.sync_drafts
  drop constraint if exists sync_drafts_kind_check;

alter table public.sync_drafts
  add constraint sync_drafts_kind_check
    check (kind in (
      'task.create', 'task.update', 'task.delete',
      'schedule_block.create', 'schedule_block.update', 'schedule_block.delete',
      'calendar_event.dismiss',
      'timer.start', 'timer.start_event', 'timer.stop'
    ));
