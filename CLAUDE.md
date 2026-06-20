# TimeFraim — Agent Orientation (Claude Code)

This document is the canonical project brief for AI coding agents. Read it at the start of every session instead of re-exploring the repo. Keep it current: see [Maintaining this file](#maintaining-this-file).

Sibling files [AGENTS.md](AGENTS.md) (Codex) and [GEMINI.md](GEMINI.md) (Gemini CLI) mirror this content for other harnesses. Update all three together when code structure changes.

---

## 1. Project overview

**TimeFraim** is a single-user local-first scheduling app — a Sunsama-style planner. Users manage tasks, build time-blocked day plans on a visual timeline, sync with Google Calendar / Tasks, and track time via Toggl. A remote MCP endpoint lets AI agents propose and confirm planner changes.

Primary flows:
- Planner: three-column layout (task queue / timeline / detail panel) with drag-and-drop scheduling.
- Board: Jira-style kanban scheduler where task cards move through status columns and can schedule/open work on the day planner timeline.
- Settings: connect Google Calendar (multi-calendar, colors, timeline sync as Calendar events or Google Tasks) and Toggl (workspace + per-task project overrides).
- Draft-first mutations: AI-proposed changes land as `sync_drafts` rows; the user confirms before they apply.

## 2. Tech stack

- **Frontend:** Vite + React 19 + TypeScript + TailwindCSS 4 + Radix UI (shadcn-style primitives), React Router v7, TanStack Query, React Hook Form, dnd-kit.
- **Backend:** Fastify 5 + TypeScript on Node ≥ 24.
- **Database:** PostgreSQL via local Supabase (host ports `55331`–`55337`), accessed with `pg` (parameterized queries).
- **Shared contracts:** Zod schemas in `packages/shared` consumed by both apps.
- **Integrations:** Google Calendar + Google Tasks (`googleapis`), Toggl Track REST, MCP (`@modelcontextprotocol/sdk`) over HTTP Streamable transport.
- **Tooling:** pnpm 10.11.0 workspaces, ESLint flat config, Vitest, React Testing Library.

## 3. Monorepo layout

```
timefraim/
├── apps/
│   ├── server/          # Fastify API + MCP endpoint
│   └── web/             # Vite + React SPA
├── docs/
│   └── deploy-linux-prod.md # Production deploy runbook (Linux/nginx via SSH tunnel)
├── packages/
│   └── shared/          # Zod schemas shared by apps
├── skills/
│   ├── coding-standards/ # Repo-local production coding standards for Node/React/TypeScript
│   └── sync-agent-briefs/ # Repo-local maintenance skill for AGENTS/CLAUDE/GEMINI sync
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/      # Timestamped SQL migrations
├── .env.example         # Canonical env var list
├── eslint.config.mjs    # Flat config, max-lines: 200 for source
├── tsconfig.base.json   # ES2022, strict mode
├── pnpm-workspace.yaml
└── package.json         # Workspace scripts
```

## 4. Applications

### 4.1 apps/web (frontend, port 6173)

- **Entry:** `src/main.tsx` → `src/App.tsx` (theme provider + auth guard + QueryClientProvider + BrowserRouter + toaster).
- **Pages:** `src/pages/planner-page.tsx`, `src/pages/kanban-page.tsx`, `src/pages/settings-page.tsx`.
- **Settings integrations:** `src/pages/settings-google-calendars-card.tsx`, `src/pages/settings-toggl-card.tsx`.
- **Feature code:** `src/features/planner/` — task cards, calendar cards, timeline board, column layout; `src/features/kanban/` — status board columns/cards, planner links, an active-timer banner, and timeline scheduling helpers.
- **Reusable UI:** `src/components/ui/` (shadcn-style primitives), `src/components/layout/app-shell.tsx`.
- **Theme:** `src/theme/` — local light/dark/system preference, document class management, and resolved theme hook.
- **Hooks:** `src/hooks/` — `use-planner-mutations.ts` (optimistic updates), `use-app-shell-data.ts`, `use-supabase-session.ts`, `use-planner-page-controller.ts`.
- **API clients & config:** `src/lib/` — `api-planner.ts`, `api-integrations.ts`, `api-client.ts`, `env.ts`, `supabase.ts`.
- **Styles:** `src/styles/` (Tailwind globals) plus `index.html` for the pre-hydration theme resolver.
- **State model:** React Query owns server state; React Hook Form owns forms; Supabase client owns auth session.

### 4.2 apps/server (backend, port 4000)

- **Entry:** `src/index.ts` — registers HTTP routes, mounts `POST /mcp`, constructs `PlannerService`.
- **Config:** `src/config/env.ts` (Zod-validated env; locates the repo-root `.env` by walking up to `pnpm-workspace.yaml`).
- **Production build:** `tsup.config.ts` bundles `@timefraim/shared` into `dist/index.js` (the shared package resolves to TS source and is not runtime-loadable); run the build with `pnpm start:server`. Deploy runbook: `docs/deploy-linux-prod.md`.
- **HTTP routes:** `src/http/` — `routes.ts` + modular `register-*-routes.ts` (planner, integration, preferences, auth, timer, draft). `auth.ts` verifies Supabase JWT. `route-helpers.ts` holds shared middleware.
- **Repositories (data access):** `src/repositories/` — `planner-repository.ts` composes per-domain stores (`planner-repository-task-store.ts`, `-schedule-store.ts`, `-calendar-store.ts`, `-timer-store.ts`, `-integration-store.ts`, `-preferences-store.ts`, `-draft-store.ts`). Row → domain mapping in `planner-repository-mappers.ts`; row types in `planner-repository-types.ts`.
- **Services (business logic):** `src/services/` — `planner-service.ts` orchestrates; `planner-service-google-integrations.ts`, `planner-service-toggl-integrations.ts` handle external calls; `planner-service-preferences.ts` reads/writes user preferences; `planner-domain.ts` applies drafts; `planner-*-changes.ts` compute diffs; `planner-service-apply.ts` confirms drafts; `planner-side-effects.ts` handles audit logs + external syncs.
- **Integrations:** `src/integration/` — `google-calendar.ts` (+ `-helpers.ts`), `google-auth.ts`, `google-tasks.ts`, `toggl-track.ts` (+ `-catalog.ts`, `-client.ts`), `integration-crypto.ts` (AES for stored tokens).
- **MCP:** `src/mcp/create-mcp-server.ts` defines two tool profiles (read-only, full-access) selected by bearer token.
- **DB pool:** `src/db/pool.ts` exposes `pg.Pool` + `withTransaction` helper.
- **Utilities:** `src/utils/date.ts`.

### 4.3 packages/shared (`@timefraim/shared`)

Zod schemas and inferred types, barrel-exported from `src/index.ts`. Consumed as TypeScript source (no build step required for dev).

- `task.ts` — `Task`, `TaskInput`, `TaskUpdate`, `TaskStatus`, `TaskPriority` (`low | medium | high | urgent`), `TaskCategory` (`personal | work`).
- `schedule.ts` — `ScheduleBlock`, `ScheduleBlockCreate/Update`, Google event/task mirror IDs, `CalendarEvent`, `CalendarEventView`.
- `drafts.ts` — `SyncDraft`, `DraftKind`, `DraftStatus`, `ActorRole`, `formatDraftSummary()`.
- `integration.ts` — Google/Toggl schemas, Google planner sync target, `AuthUser`, `AuthSession`.
- `preferences.ts` — `UserPreferences`, `UserPreferencesUpdate`, `ThemeMode` (theme + task-notification toggles).
- `day-plan.ts` — `DayPlan` (aggregated snapshot returned by `GET /api/day-plan`).
- `api.ts` — `PlannerMutationResult`, `CalendarSyncResult`.
- `date.ts` — date parsing helpers.

## 5. Database (Supabase / Postgres)

Migrations live in `supabase/migrations/` (timestamp-prefixed, applied in order). Core tables:

| Table | Purpose |
|---|---|
| `tasks` | User tasks: status, priority, category (personal/work), estimated minutes, notes, toggl_project_id. |
| `schedule_blocks` | Time blocks tied to tasks; `google_event_id` / `google_task_id` are mutually exclusive external mirrors. |
| `calendar_events` | Synced external events: provider, external_event_id, raw_payload JSONB. |
| `integration_tokens` | Encrypted OAuth/API tokens keyed by provider; metadata JSONB. |
| `sync_drafts` | Pending/applied change proposals: kind, payload, actor_role, expires_at. |
| `calendar_sync_runs` | Per-day Google Calendar sync markers keyed by date, timezone, and source calendar set. |
| `timer_sessions` | Active/finished Toggl timers: task_id, toggl_entry_id, duration_seconds. |
| `user_preferences` | Per-user app settings: theme + task start/end notification toggles. |
| `audit_logs` | Append-only change log. |
| `app_access_users` | Lowercased email allowlist used by public-table RLS policies. |

Conventions: UUID PKs (`gen_random_uuid()`), `timestamptz` for every date, `updated_at` trigger on mutable tables, FK `on delete cascade`, indexes on time ranges and common filters.

Public app tables have RLS enabled for hosted Supabase use. Browser data access still goes through the Fastify API; the Supabase client is used for auth. RLS protects the hosted PostgREST surface by allowing full app-table access only to authenticated JWTs whose email is present in `public.app_access_users`; anon receives no app-table policies. The backend's direct Postgres connection is still trusted to enforce API-layer authorization.

Recent migrations (see filenames for dates): task priority, per-user Toggl connections, Google calendar event colors, event timers + multi-calendar, removal of `archived` status, Toggl project per calendar event, per-day calendar sync runs, schedule block Google Task mirror IDs, per-user preferences (theme + notifications), single-user RLS allowlist, task category (personal/work), removal of `in_progress` status.

## 6. External integrations

- **Google Calendar** — OAuth 2.0 (`googleapis`). Lists calendars, fetches events per date range, optionally creates/updates/deletes events for schedule blocks (uses `extendedProperties` for linkage), resolves colors. Primary + "Free Time Tasks" planner calendar via `GOOGLE_CALENDAR_ID` / `GOOGLE_PLANNER_CALENDAR_ID`.
- **Google Tasks** — OAuth 2.0 (`googleapis`). Timeline sync can target the default Google Tasks list instead of Calendar events; scheduled block add/update/delete mirrors create/update/delete a single Google Task, mutually exclusive with `google_event_id`. Completion status syncs bidirectionally for TimeFraim-created task mirrors: TimeFraim done/not-done changes patch Google Tasks, and planner sync pulls Google Tasks done/not-done changes back into local task status. The OAuth Google Cloud project must have `tasks.googleapis.com` enabled before the Tasks target can be saved or used. The public Tasks API only stores due dates, not due times; TimeFraim sends the local planner date as the due date and writes the time range + duration into the task notes.
- **Toggl Track** — Personal API token, encrypted at rest in `integration_tokens`. Discover workspaces/projects, start/stop time entries, per-task and per-event project overrides.
- **MCP** — `POST /mcp` with `Authorization: Bearer <token>`. `MCP_BEARER_TOKEN` grants full-access tools; `MCP_READ_ONLY_TOKEN` grants read-only. Tools include `list_tasks`, `list_calendar_view`, `get_day_plan`, `propose_task_create`, `propose_schedule_block_*`, `confirm_draft`, `start_task_timer`, `stop_active_timer`.

## 7. Commands

Root scripts (all use `corepack pnpm` under the hood):

```bash
pnpm agent-briefs:sync   # regenerate CLAUDE.md and GEMINI.md from AGENTS.md
pnpm agent-briefs:check  # fail if CLAUDE.md or GEMINI.md drift from AGENTS.md
pnpm sandbox:start       # start the Docker sandbox (Supabase + app container)
pnpm sandbox:stop        # stop the Docker sandbox
pnpm sandbox:status      # show sandbox container status
pnpm dev           # web + server in parallel
pnpm dev:linked    # web + server in parallel against LINKED_SUPABASE_* values
pnpm dev:web       # web only (6173)
pnpm dev:server    # server only (4000)
pnpm start:server  # run the built API (apps/server/dist) — production
pnpm deploy:prod   # update the prod deploy: pull + install + build + restart timefraim-api (scripts/deploy-prod.sh)
pnpm lint          # ESLint across shared/server/web
pnpm typecheck     # tsc --noEmit across all packages
pnpm test          # Vitest across all packages
pnpm build         # build shared → server → web
pnpm check         # agent brief sync check + lint + typecheck + test + build
```

Supabase (local):

```bash
supabase start           # boot local Postgres on 55331-55337
supabase migration up    # apply pending migrations
supabase db reset        # drop, recreate, run migrations + seed
```

Linked Supabase DB bootstrap/data migration:

```bash
# Use LINKED_SUPABASE_POSTGRES_URL from .env; do not print secrets in logs.
supabase db push --db-url "$LINKED_SUPABASE_POSTGRES_URL" --include-all --dry-run
supabase db push --db-url "$LINKED_SUPABASE_POSTGRES_URL" --include-all
```

Before writing to the linked DB, create timestamped local and linked backups. For a durable local-to-linked data copy, include public app tables plus `auth.users`, `auth.identities`, `storage.buckets`, and `storage.objects`; exclude volatile auth/session tables such as sessions, refresh tokens, one-time tokens, flow state, OAuth state, MFA challenge rows, and auth audit logs. Host `psql` / `pg_dump` may be unavailable, but the local container `supabase_db_timefraim` includes Postgres tooling.

Linked Supabase dev server:

```bash
pnpm dev:linked
```

`pnpm dev:linked` does not start the local Supabase stack. It loads `.env`, maps `LINKED_SUPABASE_URL`, `LINKED_SUPABASE_PUBLISHABLE_KEY`, `LINKED_SUPABASE_SERVICE_ROLE_KEY`, and `LINKED_SUPABASE_POSTGRES_URL` onto the standard runtime variables, then starts the normal web/API dev servers. `LINKED_SUPABASE_JWT_SECRET` is optional unless linked auth access tokens are HS256-signed; without it, the launcher uses a placeholder so JWKS-signed tokens can still work and warns that API requests may return `401` after login.

Sandbox CLI:

```bash
pnpm sandbox:start
# or, after linking/installing the package bin:
timefraim sandbox start
```

`pnpm sandbox:start` runs `supabase start` and then launches the web/API app inside a `node:24-bookworm` Docker container named `timefraim-app-sandbox`. Source is bind-mounted at `/workspace`; dependency folders and the pnpm store use named Docker volumes. The app is exposed on `127.0.0.1:6173` and `127.0.0.1:4000`, while the app container reaches Supabase via `host.docker.internal`.

No change is done until `pnpm lint` and `pnpm typecheck` pass locally. Before opening a PR, run `pnpm check` — it is the same gate CI uses.

### Dev server + preview (Claude Code / preview tool)

`.claude/launch.json` defines two servers (`server` on port 4000, `web` on port 6173) that the `preview_start` tool can launch. To spin up a live interactive preview:

```bash
# 1. Ensure Supabase is running
supabase status          # check
supabase start           # start if needed

# 2. Start both servers via preview_start (uses .claude/launch.json)
preview_start("server")  # Fastify API on 4000
preview_start("web")     # Vite dev server on 6173
```

**Auth bypass (Google OAuth is unavailable on localhost):**

The app gates on a Supabase session. Email login is disabled; only Google OAuth is configured. Use the local Supabase admin API to generate a magic link for `ALLOWED_EMAIL` (read from `.env`), then navigate the preview to it — Supabase verifies and redirects back to the app with a valid session automatically.

```bash
# Generate a magic link (use SUPABASE_SERVICE_ROLE_KEY and ALLOWED_EMAIL from .env)
curl -s -X POST "http://127.0.0.1:55331/auth/v1/admin/generate_link" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "magiclink", "email": "$ALLOWED_EMAIL"}'
# Response includes "action_link": "http://127.0.0.1:55331/auth/v1/verify?token=...&redirect_to=http://127.0.0.1:6173"
```

Then in `preview_eval`:
```js
window.location.href = "<action_link from response>";
```

The Supabase JS client picks up the tokens from the redirect URL hash and the session is established. This works even though email login is disabled — `generate_link` is an admin endpoint that bypasses provider restrictions. It does **not** change the user's password.

## 8. Environment

Canonical list lives in [.env.example](.env.example). Highlights:

- **Frontend (`VITE_*`):** `VITE_APP_ORIGIN`, `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALLOWED_EMAIL`.
- **Backend:** `NODE_ENV`, `PORT`, `HOST`, `APP_ORIGIN` (comma-separated CORS origins), `API_BASE_URL`, `DATABASE_URL`, `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`/`JWT_SECRET`, `INTEGRATION_ENCRYPTION_KEY`, `ALLOWED_EMAIL`, `MCP_BEARER_TOKEN`, `MCP_READ_ONLY_TOKEN`, `GOOGLE_CLIENT_ID`/`SECRET`, `GOOGLE_CALENDAR_ID`, `GOOGLE_PLANNER_CALENDAR_ID`, `TUNNEL_PUBLIC_BASE_URL`.
- **Linked dev (`pnpm dev:linked`):** `LINKED_SUPABASE_URL`, `LINKED_SUPABASE_PUBLISHABLE_KEY`, `LINKED_SUPABASE_SERVICE_ROLE_KEY`, `LINKED_SUPABASE_POSTGRES_URL`, optional `LINKED_SUPABASE_JWT_SECRET`.

`ALLOWED_EMAIL` gates login (single-user app). `INTEGRATION_ENCRYPTION_KEY` must be a long random secret — regenerating it invalidates stored Toggl tokens.

## 9. Conventions & code style

- **File naming:** kebab-case for files (`planner-service.ts`, `task-pill.tsx`); PascalCase only inside React component exports. Hooks start with `use-`.
- **Layers:** route → service → repository → db pool. Services never touch SQL; repositories never hold business logic.
- **Contracts:** every API boundary validates with a Zod schema from `@timefraim/shared`. Never hand-write request/response types in an app.
- **Coding standards:** use `skills/coding-standards/SKILL.md` before implementation, refactors, API work, UI state handling, error handling, persistence changes, security-sensitive code, performance-sensitive code, tests, and reviews.
- **Mutations:** AI/agent changes go through the draft pipeline (`propose_* → confirm_draft`). Direct user actions still hit typed mutation routes.
- **Max file size:** ESLint enforces `max-lines: 200` (excludes blanks, comments, tests, `vite-env.d.ts`). When a file approaches the limit, split by responsibility — this is why `planner-repository-*-store.ts` and `planner-service-*-integrations.ts` are split.
- **Repository layer:** `no-unsafe-argument` / `no-unsafe-assignment` are relaxed here only; keep unsafe code confined to this layer.
- **Testing:** co-located `*.test.ts[x]`, Vitest runner, React Testing Library for components. `max-lines` and several type-safety rules are off in tests.
- **Dates:** always `timestamptz` in DB, always UTC on the wire. Frontend passes timezone offset via `tz` query param.
- **Secrets:** integration tokens encrypted via `integration-crypto.ts` before hitting the DB.
- **Completion gate:** never mark work done while `pnpm lint` or `pnpm typecheck` fail. When structural or meaningful project facts change, update `AGENTS.md`, run `pnpm agent-briefs:sync`, and keep `CLAUDE.md` / `GEMINI.md` in lockstep.
- **UI verification:** Do not spin up the dev server to autonomously verify frontend changes — use `pnpm lint` and `pnpm typecheck` only, then report the change as done. Exception: when the user explicitly asks to spin up a preview or dev server, follow the "Dev server + preview" workflow in §7.

## 10. Key files map

| Path | What lives here |
|---|---|
| [apps/web/src/App.tsx](apps/web/src/App.tsx) | Root layout, auth guard, query client, router |
| [apps/web/src/theme/theme-provider.tsx](apps/web/src/theme/theme-provider.tsx) | Client theme preference, resolved mode tracking, and `<html>` class sync |
| [apps/web/src/pages/planner-page.tsx](apps/web/src/pages/planner-page.tsx) | Main scheduling UI |
| [apps/web/src/pages/kanban-page.tsx](apps/web/src/pages/kanban-page.tsx) | Kanban scheduler UI with board-to-planner task links |
| [apps/web/src/pages/settings-page.tsx](apps/web/src/pages/settings-page.tsx) | Integration configuration UI |
| [apps/web/src/hooks/use-planner-mutations.ts](apps/web/src/hooks/use-planner-mutations.ts) | Task/schedule/timer mutations |
| [apps/web/src/lib/api-planner.ts](apps/web/src/lib/api-planner.ts) | Planner HTTP client |
| [apps/web/src/components/timeline-board.tsx](apps/web/src/components/timeline-board.tsx) | Timeline rendering |
| [apps/server/src/index.ts](apps/server/src/index.ts) | Server entry, route + MCP registration |
| [apps/server/src/services/planner-service.ts](apps/server/src/services/planner-service.ts) | Business-logic orchestrator |
| [apps/server/src/repositories/planner-repository.ts](apps/server/src/repositories/planner-repository.ts) | Data access entry point |
| [apps/server/src/integration/google-calendar.ts](apps/server/src/integration/google-calendar.ts) | Google Calendar client |
| [apps/server/src/integration/google-tasks.ts](apps/server/src/integration/google-tasks.ts) | Google Tasks client |
| [apps/server/src/integration/toggl-track.ts](apps/server/src/integration/toggl-track.ts) | Toggl client |
| [apps/server/src/mcp/create-mcp-server.ts](apps/server/src/mcp/create-mcp-server.ts) | MCP tools exposed to agents |
| [packages/shared/src/index.ts](packages/shared/src/index.ts) | Shared schema barrel |
| [docs/deploy-linux-prod.md](docs/deploy-linux-prod.md) | Production deploy runbook (Linux/nginx, SSH tunnel) |
| [apps/server/tsup.config.ts](apps/server/tsup.config.ts) | Server build config (bundles `@timefraim/shared`) |
| [skills/coding-standards/SKILL.md](skills/coding-standards/SKILL.md) | Production coding standards for Node, React, and TypeScript work |
| [skills/sync-agent-briefs/SKILL.md](skills/sync-agent-briefs/SKILL.md) | Repo-local workflow for syncing agent orientation files |
| [supabase/migrations/](supabase/migrations/) | Schema evolution |
| [eslint.config.mjs](eslint.config.mjs) | Lint rules incl. `max-lines: 200` |

---

## Maintaining this file

**Whenever you change the codebase in a way this document describes, update it in the same change.** Examples that require an update:

- Adding, removing, renaming, or re-homing a directory under `apps/`, `packages/`, `apps/*/src/`, or `supabase/`.
- Adding a top-level app or package, or changing the workspace layout.
- Adding/removing an HTTP route group, MCP tool, or integration.
- Adding a Supabase migration that introduces or removes a table.
- Changing root `package.json` scripts, ESLint rules that affect structure (e.g. `max-lines`), or environment variables in `.env.example`.
- Changing a file listed in [Key files map](#10-key-files-map), or adding something that belongs in it.

Treat `AGENTS.md` as the canonical source for the mirrored harness briefs. After updating it, run `pnpm agent-briefs:sync` and `pnpm agent-briefs:check` so [CLAUDE.md](CLAUDE.md) and [GEMINI.md](GEMINI.md) stay aligned.

Do **not** use this file for ephemeral notes (in-flight TODOs, session state, debugging logs). It is a map, not a journal.
