create table if not exists public.app_access_users (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.app_access_users (email)
select distinct lower(email)
from auth.users
where email is not null
on conflict (email) do nothing;

create or replace function public.is_timefraim_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.app_access_users
    where email = lower(auth.email())
  );
$$;

revoke all on function public.is_timefraim_allowed_user() from public;
grant execute on function public.is_timefraim_allowed_user() to authenticated;

alter table public.app_access_users enable row level security;

drop policy if exists app_access_users_select_self on public.app_access_users;
create policy app_access_users_select_self
on public.app_access_users
for select
to authenticated
using (email = lower(auth.email()));

alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_allowed_user_all on public.audit_logs;
create policy audit_logs_allowed_user_all
on public.audit_logs
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.calendar_events enable row level security;
drop policy if exists calendar_events_allowed_user_all on public.calendar_events;
create policy calendar_events_allowed_user_all
on public.calendar_events
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.calendar_sync_runs enable row level security;
drop policy if exists calendar_sync_runs_allowed_user_all on public.calendar_sync_runs;
create policy calendar_sync_runs_allowed_user_all
on public.calendar_sync_runs
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.integration_tokens enable row level security;
drop policy if exists integration_tokens_allowed_user_all on public.integration_tokens;
create policy integration_tokens_allowed_user_all
on public.integration_tokens
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.schedule_blocks enable row level security;
drop policy if exists schedule_blocks_allowed_user_all on public.schedule_blocks;
create policy schedule_blocks_allowed_user_all
on public.schedule_blocks
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.sync_drafts enable row level security;
drop policy if exists sync_drafts_allowed_user_all on public.sync_drafts;
create policy sync_drafts_allowed_user_all
on public.sync_drafts
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.tasks enable row level security;
drop policy if exists tasks_allowed_user_all on public.tasks;
create policy tasks_allowed_user_all
on public.tasks
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.timer_sessions enable row level security;
drop policy if exists timer_sessions_allowed_user_all on public.timer_sessions;
create policy timer_sessions_allowed_user_all
on public.timer_sessions
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.user_preferences enable row level security;
drop policy if exists user_preferences_allowed_user_all on public.user_preferences;
create policy user_preferences_allowed_user_all
on public.user_preferences
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());

alter table public.user_toggl_connections enable row level security;
drop policy if exists user_toggl_connections_allowed_user_all on public.user_toggl_connections;
create policy user_toggl_connections_allowed_user_all
on public.user_toggl_connections
for all
to authenticated
using (public.is_timefraim_allowed_user())
with check (public.is_timefraim_allowed_user());
