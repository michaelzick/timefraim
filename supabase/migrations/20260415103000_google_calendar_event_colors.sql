alter table public.calendar_events
  add column if not exists background_color text,
  add column if not exists foreground_color text;
