-- Add per-calendar-event Toggl project override
alter table public.calendar_events
  add column if not exists toggl_project_id text;

-- Extend the sync_drafts kind constraint to allow calendar_event.update
alter table public.sync_drafts
  drop constraint if exists sync_drafts_kind_check;

alter table public.sync_drafts
  add constraint sync_drafts_kind_check
    check (kind in (
      'task.create', 'task.update', 'task.delete',
      'schedule_block.create', 'schedule_block.update', 'schedule_block.delete',
      'calendar_event.dismiss', 'calendar_event.update',
      'timer.start', 'timer.start_event', 'timer.stop'
    ));
