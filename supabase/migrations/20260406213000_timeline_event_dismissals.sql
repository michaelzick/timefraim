alter table public.calendar_events
  add column if not exists external_updated_at timestamptz,
  add column if not exists dismissed_external_updated_at timestamptz;

update public.calendar_events
set external_updated_at = case
  when is_app_managed then null
  when raw_payload ? 'updated' and nullif(raw_payload->>'updated', '') is not null
    then (raw_payload->>'updated')::timestamptz
  else updated_at
end
where external_updated_at is null;

create unique index if not exists schedule_blocks_task_id_idx
  on public.schedule_blocks (task_id);
