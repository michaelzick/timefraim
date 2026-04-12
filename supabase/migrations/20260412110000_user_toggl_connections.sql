create table if not exists public.user_toggl_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  api_token_ciphertext text not null,
  api_token_hint text not null,
  workspace_id text not null,
  workspace_name text not null,
  default_project_id text,
  default_project_name text,
  available_workspaces jsonb not null default '[]'::jsonb,
  available_projects jsonb not null default '[]'::jsonb,
  last_validated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists user_toggl_connections_touch_updated_at on public.user_toggl_connections;
create trigger user_toggl_connections_touch_updated_at
before update on public.user_toggl_connections
for each row
execute function public.touch_updated_at();

alter table public.sync_drafts
add column if not exists owner_user_id uuid references auth.users (id) on delete set null;

create index if not exists sync_drafts_owner_user_id_idx on public.sync_drafts (owner_user_id, created_at desc);
