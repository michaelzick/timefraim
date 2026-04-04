insert into public.tasks (id, title, notes, estimated_minutes, status, toggl_project_id)
values
  ('84a87ef5-f143-4b9b-9f6b-b7c608d72ac1', 'Plan launch week', 'Outline the week and protect deep-work blocks.', 45, 'planned', null),
  ('7d7a8c78-c1fb-4259-8065-7768438bbf97', 'Draft MCP prompts', 'Define the tool usage patterns for Claude and ChatGPT.', 60, 'inbox', null),
  ('4d71e2c8-7df9-4f9b-b177-32f4b1ae8c53', 'Review Toggl workspace', 'Verify default project mapping and clean timer categories.', 30, 'inbox', null)
on conflict (id) do nothing;

insert into public.calendar_events (external_event_id, title, start_at, end_at, is_app_managed, raw_payload)
values
  (
    'seed-external-standup',
    'Team standup',
    timezone('utc', now()) + interval '2 hours',
    timezone('utc', now()) + interval '2 hours 30 minutes',
    false,
    jsonb_build_object('seeded', true)
  )
on conflict (provider, external_event_id) do nothing;
