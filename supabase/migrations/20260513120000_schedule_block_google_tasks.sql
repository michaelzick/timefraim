alter table public.schedule_blocks
add column if not exists google_task_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'schedule_blocks_single_google_artifact'
  ) then
    alter table public.schedule_blocks
    add constraint schedule_blocks_single_google_artifact
    check (google_event_id is null or google_task_id is null);
  end if;
end;
$$;
