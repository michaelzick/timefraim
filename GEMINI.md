# TimeFraim — Agent Orientation (Gemini CLI)

This document is the canonical project brief for AI coding agents. Read it at the start of every session instead of re-exploring the repo. Keep it current: see [Maintaining this file](#maintaining-this-file).

Sibling files [CLAUDE.md](CLAUDE.md) (Claude Code) and [AGENTS.md](AGENTS.md) (Codex) mirror this content for other harnesses. Update all three together when code structure changes.

---

## 1. Project overview

**TimeFraim** is a single-user local-first scheduling app — a Sunsama-style planner. Users manage tasks, build time-blocked day plans on a visual timeline, sync with Google Calendar, and track time via Toggl. A remote MCP endpoint lets AI agents propose and confirm planner changes.

Primary flows:
- Planner: three-column layout (task queue / timeline / detail panel) with drag-and-drop scheduling.
- Settings: connect Google Calendar (multi-calendar, colors, optional planner-block sync), Toggl (workspace + per-task project overrides), and OpenAI Images (encrypted API key + GPT Image 2 preview generation).
- Draft-first mutations: AI-proposed changes land as `sync_drafts` rows; the user confirms before they apply.

## 2. Tech stack

- **Frontend:** Vite + React 19 + TypeScript + TailwindCSS 4 + Radix UI (shadcn-style primitives), React Router v7, TanStack Query, React Hook Form, dnd-kit.
- **Backend:** Fastify 5 + TypeScript on Node ≥ 24.
- **Database:** PostgreSQL via local Supabase (host ports `55331`–`55337`), accessed with `pg` (parameterized queries).
- **Shared contracts:** Zod schemas in `packages/shared` consumed by both apps.
- **Integrations:** Google Calendar (`googleapis`), Toggl Track REST, OpenAI Images (`gpt-image-2` via `fetch`), MCP (`@modelcontextprotocol/sdk`) over HTTP Streamable transport.
- **Tooling:** pnpm 10.11.0 workspaces, ESLint flat config, Vitest, React Testing Library.

## 3. Monorepo layout

```
timefraim/
├── apps/
│   ├── server/          # Fastify API + MCP endpoint
│   └── web/             # Vite + React SPA
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

### 4.1 apps/web (frontend, port 5173)

- **Entry:** `src/main.tsx` → `src/App.tsx` (theme provider + auth guard + QueryClientProvider + BrowserRouter + toaster).
- **Pages:** `src/pages/planner-page.tsx`, `src/pages/settings-page.tsx`.
- **Settings integrations:** `src/pages/settings-google-calendars-card.tsx`, `src/pages/settings-toggl-card.tsx`, `src/pages/settings-openai-image-card.tsx`.
- **Feature code:** `src/features/planner/` — task cards, calendar cards, timeline board, column layout.
- **Reusable UI:** `src/components/ui/` (shadcn-style primitives), `src/components/layout/app-shell.tsx`.
- **Theme:** `src/theme/` — local light/dark/system preference, document class management, and resolved theme hook.
- **Hooks:** `src/hooks/` — `use-planner-mutations.ts` (optimistic updates), `use-app-shell-data.ts`, `use-supabase-session.ts`, `use-planner-page-controller.ts`.
- **API clients & config:** `src/lib/` — `api-planner.ts`, `api-integrations.ts`, `api-client.ts`, `env.ts`, `supabase.ts`.
- **Styles:** `src/styles/` (Tailwind globals) plus `index.html` for the pre-hydration theme resolver.
- **State model:** React Query owns server state; React Hook Form owns forms; Supabase client owns auth session.

### 4.2 apps/server (backend, port 4000)

- **Entry:** `src/index.ts` — registers HTTP routes, mounts `POST /mcp`, constructs `PlannerService`.
- **Config:** `src/config/env.ts` (Zod-validated env).
- **HTTP routes:** `src/http/` — `routes.ts` + modular `register-*-routes.ts` (planner, integration, auth, timer, draft). `auth.ts` verifies Supabase JWT. `route-helpers.ts` holds shared middleware.
- **Repositories (data access):** `src/repositories/` — `planner-repository.ts` composes per-domain stores (`planner-repository-task-store.ts`, `-schedule-store.ts`, `-calendar-store.ts`, `-timer-store.ts`, `-integration-store.ts`, `-draft-store.ts`). Row → domain mapping in `planner-repository-mappers.ts`; row types in `planner-repository-types.ts`.
- **Services (business logic):** `src/services/` — `planner-service.ts` orchestrates; `planner-service-google-integrations.ts`, `planner-service-toggl-integrations.ts`, and `planner-service-openai-images.ts` handle external calls; `planner-domain.ts` applies drafts; `planner-*-changes.ts` compute diffs; `planner-service-apply.ts` confirms drafts; `planner-side-effects.ts` handles audit logs + external syncs.
- **Integrations:** `src/integration/` — `google-calendar.ts` (+ `-helpers.ts`), `google-auth.ts`, `google-tasks.ts`, `toggl-track.ts` (+ `-catalog.ts`, `-client.ts`), `openai-images.ts`, `integration-crypto.ts` (AES for stored tokens).
- **MCP:** `src/mcp/create-mcp-server.ts` defines two tool profiles (read-only, full-access) selected by bearer token.
- **DB pool:** `src/db/pool.ts` exposes `pg.Pool` + `withTransaction` helper.
- **Utilities:** `src/utils/date.ts`.

### 4.3 packages/shared (`@timefraim/shared`)

Zod schemas and inferred types, barrel-exported from `src/index.ts`. Consumed as TypeScript source (no build step required for dev).

- `task.ts` — `Task`, `TaskInput`, `TaskUpdate`, `TaskStatus`, `TaskPriority` (`low | medium | high | urgent`).
- `schedule.ts` — `ScheduleBlock`, `ScheduleBlockCreate/Update`, `CalendarEvent`, `CalendarEventView`.
- `drafts.ts` — `SyncDraft`, `DraftKind`, `DraftStatus`, `ActorRole`, `formatDraftSummary()`.
- `integration.ts` — Google/Toggl/OpenAI image schemas, `AuthUser`, `AuthSession`.
- `day-plan.ts` — `DayPlan` (aggregated snapshot returned by `GET /api/day-plan`).
- `api.ts` — `PlannerMutationResult`, `CalendarSyncResult`.
- `date.ts` — date parsing helpers.

## 5. Database (Supabase / Postgres)

Migrations live in `supabase/migrations/` (timestamp-prefixed, applied in order). Core tables:

| Table | Purpose |
|---|---|
| `tasks` | User tasks: status, priority, estimated minutes, notes, toggl_project_id. |
| `schedule_blocks` | Time blocks tied to tasks; `google_event_id` links to a Calendar event. |
| `calendar_events` | Synced external events: provider, external_event_id, raw_payload JSONB. |
| `integration_tokens` | Encrypted OAuth/API tokens keyed by provider; metadata JSONB. |
| `sync_drafts` | Pending/applied change proposals: kind, payload, actor_role, expires_at. |
| `timer_sessions` | Active/finished Toggl timers: task_id, toggl_entry_id, duration_seconds. |
| `audit_logs` | Append-only change log. |

Conventions: UUID PKs (`gen_random_uuid()`), `timestamptz` for every date, `updated_at` trigger on mutable tables, FK `on delete cascade`, indexes on time ranges and common filters.

Recent migrations (see filenames for dates): task priority, per-user Toggl connections, Google calendar event colors, event timers + multi-calendar, removal of `archived` status, Toggl project per calendar event.

## 6. External integrations

- **Google Calendar** — OAuth 2.0 (`googleapis`). Lists calendars, fetches events per date range, optionally creates/updates/deletes events for schedule blocks (uses `extendedProperties` for linkage), resolves colors. Primary + "Free Time Tasks" planner calendar via `GOOGLE_CALENDAR_ID` / `GOOGLE_PLANNER_CALENDAR_ID`.
- **Toggl Track** — Personal API token, encrypted at rest in `integration_tokens`. Discover workspaces/projects, start/stop time entries, per-task and per-event project overrides.
- **OpenAI Images** — Encrypted API key stored in `integration_tokens`. Settings exposes a server-backed GPT Image 2 preview flow via `POST /api/integrations/openai/images`, using the Images API (`/v1/images/generations`) with PNG output.
- **MCP** — `POST /mcp` with `Authorization: Bearer <token>`. `MCP_BEARER_TOKEN` grants full-access tools; `MCP_READ_ONLY_TOKEN` grants read-only. Tools include `list_tasks`, `list_calendar_view`, `get_day_plan`, `propose_task_create`, `propose_schedule_block_*`, `confirm_draft`, `start_task_timer`, `stop_active_timer`.

## 7. Commands

Root scripts (all use `corepack pnpm` under the hood):

```bash
pnpm agent-briefs:sync   # regenerate CLAUDE.md and GEMINI.md from AGENTS.md
pnpm agent-briefs:check  # fail if CLAUDE.md or GEMINI.md drift from AGENTS.md
pnpm dev           # web + server in parallel
pnpm dev:web       # web only (5173)
pnpm dev:server    # server only (4000)
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

No change is done until `pnpm lint` and `pnpm typecheck` pass locally. Before opening a PR, run `pnpm check` — it is the same gate CI uses.

## 8. Environment

Canonical list lives in [.env.example](.env.example). Highlights:

- **Frontend (`VITE_*`):** `VITE_APP_ORIGIN`, `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALLOWED_EMAIL`.
- **Backend:** `NODE_ENV`, `PORT`, `APP_ORIGIN` (comma-separated CORS origins), `API_BASE_URL`, `DATABASE_URL`, `SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY`/`JWT_SECRET`, `INTEGRATION_ENCRYPTION_KEY`, `ALLOWED_EMAIL`, `MCP_BEARER_TOKEN`, `MCP_READ_ONLY_TOKEN`, `GOOGLE_CLIENT_ID`/`SECRET`, `GOOGLE_CALENDAR_ID`, `GOOGLE_PLANNER_CALENDAR_ID`, `TUNNEL_PUBLIC_BASE_URL`.

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

## 10. Key files map

| Path | What lives here |
|---|---|
| [apps/web/src/App.tsx](apps/web/src/App.tsx) | Root layout, auth guard, query client, router |
| [apps/web/src/theme/theme-provider.tsx](apps/web/src/theme/theme-provider.tsx) | Client theme preference, resolved mode tracking, and `<html>` class sync |
| [apps/web/src/pages/planner-page.tsx](apps/web/src/pages/planner-page.tsx) | Main scheduling UI |
| [apps/web/src/pages/settings-page.tsx](apps/web/src/pages/settings-page.tsx) | Integration configuration UI |
| [apps/web/src/pages/settings-openai-image-card.tsx](apps/web/src/pages/settings-openai-image-card.tsx) | OpenAI image integration card and GPT Image 2 preview UI |
| [apps/web/src/hooks/use-planner-mutations.ts](apps/web/src/hooks/use-planner-mutations.ts) | Task/schedule/timer mutations |
| [apps/web/src/lib/api-planner.ts](apps/web/src/lib/api-planner.ts) | Planner HTTP client |
| [apps/web/src/components/timeline-board.tsx](apps/web/src/components/timeline-board.tsx) | Timeline rendering |
| [apps/server/src/index.ts](apps/server/src/index.ts) | Server entry, route + MCP registration |
| [apps/server/src/services/planner-service.ts](apps/server/src/services/planner-service.ts) | Business-logic orchestrator |
| [apps/server/src/repositories/planner-repository.ts](apps/server/src/repositories/planner-repository.ts) | Data access entry point |
| [apps/server/src/integration/google-calendar.ts](apps/server/src/integration/google-calendar.ts) | Google Calendar client |
| [apps/server/src/integration/openai-images.ts](apps/server/src/integration/openai-images.ts) | OpenAI GPT Image 2 request adapter |
| [apps/server/src/integration/toggl-track.ts](apps/server/src/integration/toggl-track.ts) | Toggl client |
| [apps/server/src/mcp/create-mcp-server.ts](apps/server/src/mcp/create-mcp-server.ts) | MCP tools exposed to agents |
| [packages/shared/src/index.ts](packages/shared/src/index.ts) | Shared schema barrel |
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
