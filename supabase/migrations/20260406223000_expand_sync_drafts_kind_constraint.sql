alter table public.sync_drafts
  drop constraint if exists sync_drafts_kind_check;

alter table public.sync_drafts
  add constraint sync_drafts_kind_check
  check (
    kind in (
      'task.create',
      'task.update',
      'task.delete',
      'schedule_block.create',
      'schedule_block.update',
      'schedule_block.delete',
      'calendar_event.dismiss',
      'timer.start',
      'timer.stop'
    )
  );
