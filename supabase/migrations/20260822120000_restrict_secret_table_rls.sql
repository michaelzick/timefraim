-- Secret-bearing tables must not be readable through PostgREST. The API talks
-- to Postgres directly (role bypasses RLS), so browser sessions never need
-- these rows. Dropping the allowlist policies and revoking the grants closes
-- the path that let any allowlisted JWT read OAuth / Toggl tokens.
drop policy if exists integration_tokens_allowed_user_all on public.integration_tokens;
drop policy if exists user_toggl_connections_allowed_user_all on public.user_toggl_connections;

revoke all on table public.integration_tokens from anon, authenticated;
revoke all on table public.user_toggl_connections from anon, authenticated;

-- Row level security stays enabled on both tables (no policies => no access
-- for anon/authenticated). service_role and the direct connection are unaffected.
