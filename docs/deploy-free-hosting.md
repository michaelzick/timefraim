# Free hosting: Cloudflare static assets + Supabase Edge Functions

TimeFraim runs for $0 as a static SPA on Cloudflare Workers (assets only, no
Worker code) plus two Supabase Edge Functions (`api`, `mcp`) against the hosted
Supabase project that already owns auth and Postgres. This replaces the droplet
runbook in [deploy-linux-prod.md](deploy-linux-prod.md).

## Architecture

```
Browser ── https://timefraim.<account>.workers.dev      (Cloudflare static assets, SPA fallback)
   │
   ├─ /api/*   ──▶ https://<ref>.supabase.co/functions/v1/api   (Hono router over apps/server/src)
   └─ MCP      ──▶ https://<ref>.supabase.co/functions/v1/mcp   (stateless MCP, bearer tokens)
                        │
                        └─ Postgres via the Supabase transaction pooler (DATABASE_URL)
```

- `supabase/functions/api` mounts the framework-neutral route table from
  `apps/server/src/http/routes.ts`; paths arrive as `/api/...` because Supabase
  keeps the function name as the pathname prefix.
- `supabase/functions/mcp` builds a fresh MCP server per request
  (no session map), so any isolate can serve any call.
- Both functions authenticate themselves (`verify_jwt = false` in
  `supabase/config.toml`): the API verifies Supabase JWTs with jose and the
  `ALLOWED_EMAIL` gate, MCP compares the static bearer tokens.
- Google tokens are encrypted at rest and the secret tables
  (`integration_tokens`, `user_toggl_connections`) have no PostgREST access.

## One-time setup

```bash
# Cloudflare + Supabase CLIs (both already in the repo tooling)
wrangler login
supabase login
supabase link --project-ref <ref>

# Back up, then apply the pending migration (secret-table RLS)
supabase db dump --linked --data-only -s public > backup-$(date +%F).sql
supabase db push --linked --dry-run
supabase db push --linked
```

Set the function secrets **one per call** (never `supabase secrets set --env-file`,
which uploads every variable in the file):

| Secret | Value |
|---|---|
| `DATABASE_URL` | Transaction pooler URL, port **6543**: `postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?sslmode=require` |
| `APP_ORIGIN` | `https://timefraim.<account>.workers.dev` (comma-separate extra origins) |
| `INTEGRATION_ENCRYPTION_KEY` | Same value the droplet used — existing Toggl ciphertext depends on it |
| `ALLOWED_EMAIL`, `MCP_BEARER_TOKEN`, `MCP_READ_ONLY_TOKEN` | Same as the local `.env` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_ID`, `GOOGLE_PLANNER_CALENDAR_ID` | Same as the local `.env` |
| `AUTH_JWT_SECRET` | Only if the linked project issues HS256 access tokens (`SUPABASE_*` names are reserved, hence the alias) |
| `TUNNEL_PUBLIC_BASE_URL` | `https://<ref>.supabase.co/functions/v1` so Settings shows the MCP base URL |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_DB_URL` are injected by the edge runtime. `DATABASE_URL` falls back to
`SUPABASE_DB_URL` when unset, but the pooler URL above is the one to use in
production.

```bash
supabase secrets set DATABASE_URL='postgresql://…:6543/postgres?sslmode=require'
supabase secrets set APP_ORIGIN='https://timefraim.<account>.workers.dev'
# …repeat for each row above
supabase secrets list   # confirm digests
```

Web build-time values live in a gitignored root `.env.production` (Vite reads
`envDir` = repo root):

```bash
VITE_APP_ORIGIN=https://timefraim.<account>.workers.dev
VITE_API_BASE_URL=https://<ref>.supabase.co/functions/v1
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
VITE_ALLOWED_EMAIL=<same as ALLOWED_EMAIL>
```

Finally, in the Supabase dashboard → Authentication → URL Configuration, add
the workers.dev origin to the Site URL / Redirect URLs. Google Cloud needs no
change: the OAuth redirect is Supabase's own `/auth/v1/callback`.

## Deploy

```bash
pnpm check             # lint + typecheck + tests + build + functions:check
pnpm deploy:functions  # supabase functions deploy api && … mcp
pnpm deploy:web        # vite build && wrangler deploy (prints the workers.dev URL)
```

Edge functions deploy separately from git — merging a PR does not update the
hosted functions. Deploy them in the same task that changes
`supabase/functions/**` or `apps/server/src/**`.

### Optional: build the SPA with Cloudflare Workers Builds

Instead of `pnpm deploy:web` from a laptop, the Worker can be connected to the
GitHub repository (Worker → Settings → Build) so every push to the production
branch builds and deploys the SPA on Cloudflare. The repository is a pnpm
workspace and the Worker config lives in `apps/web`, so use:

| Setting | Value |
|---|---|
| Root directory | `/` |
| Build command | `pnpm run build` |
| Deploy command | `pnpm --filter @timefraim/web exec wrangler deploy` |
| Version command | `pnpm --filter @timefraim/web exec wrangler versions upload` |
| Production branch | `main` |
| Build variables | `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALLOWED_EMAIL` — the same values as `.env.production`, which is gitignored and therefore absent from the build |

Node 24 comes from the committed `.node-version`; pnpm 11 from `packageManager`
in `package.json`. The API token only needs Workers Builds permission on the
account — a token generated from the Build settings of any Worker in the account
works, but a dedicated one keeps the two apps' deploy credentials independent.
Without the build variables the build succeeds and the deployed app fails at
load with `Missing required Vite env var`, so set them before the first
production build.

## Local development

```bash
supabase start          # local stack on 55331-55337
pnpm dev:functions      # serves api + mcp from .env (filters runtime-injected keys)
```

`scripts/dev-functions.mjs` writes `supabase/.env.functions` (gitignored) from
the root `.env`, dropping `DATABASE_URL`/`SUPABASE_*` (the runtime injects
container-reachable values) and renaming `SUPABASE_JWT_SECRET` to
`AUTH_JWT_SECRET` so local HS256 tokens verify. Point the web app at the local
functions with `VITE_API_BASE_URL=http://127.0.0.1:55331/functions/v1`.

`pnpm functions:check` type-checks both entrypoints against
`supabase/functions/deno.lock` (frozen), runs `deno lint`, and the Deno tests in
`supabase/functions/_shared`. It is part of `pnpm check`.

## Verification

```bash
REF=<ref>; JWT=<supabase access token>; ORIGIN=https://timefraim.<account>.workers.dev
curl -s https://$REF.supabase.co/functions/v1/api/health                      # {"ok":true}
curl -s -H "Authorization: Bearer $JWT" https://$REF.supabase.co/functions/v1/api/auth/me
curl -si -X OPTIONS -H "Origin: $ORIGIN" -H "Access-Control-Request-Method: GET" \
  https://$REF.supabase.co/functions/v1/api/day-plan | grep -i access-control    # ACAO echo
curl -s -X POST https://$REF.supabase.co/functions/v1/mcp \
  -H "Authorization: Bearer $MCP_BEARER_TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
# PostgREST leak check — both must return an empty array or a permission error:
curl -s "https://$REF.supabase.co/rest/v1/integration_tokens?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $JWT"
curl -s "https://$REF.supabase.co/rest/v1/user_toggl_connections?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $JWT"
```

Browser: sign in on the workers.dev origin → day plan loads → Settings lists
Google calendars and shows Toggl connected → create a task, drag it onto the
timeline, confirm it appears in Google → start/stop a timer → hard-refresh
`/board` (SPA fallback, not a 404).

## Rollback

- Web: `wrangler rollback` (or redeploy a previous commit).
- Functions: `pnpm deploy:functions` from `main`.
- Database: the migration only drops policies/grants; to restore them run the
  two `create policy … for all to authenticated using (public.is_timefraim_allowed_user()) with check (…)`
  statements from `supabase/migrations/20260611120000_enable_single_user_rls.sql`
  and `grant all on table … to authenticated`.
- Google tokens: the first repository-backed read re-saves the legacy plaintext
  row encrypted (`metadata.tokenEncryption = "aes-gcm-v1"`). If that row is ever
  undecryptable (key changed), null `access_token`/`refresh_token` for
  `provider = 'google'` and sign in with Google again.

If you are migrating from another deployment, keep it running from `main` until
the checklist above passes; it is the rollback for the whole cutover window.
Tear it down last.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `password authentication failed for user "postgres"` from a function | `DATABASE_URL` uses the bare `postgres` user. The pooler needs `postgres.<ref>` (see the secrets table); percent-encode the password if it has URL-reserved characters. |
| Function returns 500 on every request right after deploy | Env validation failed at boot — usually `APP_ORIGIN` (required, no default) or `DATABASE_URL` missing. `supabase secrets list` shows names only; set the missing one and retry (no redeploy needed). |
| `supabase db dump` / `functions deploy` fails with "failed to run docker" | The CLI bundles functions and runs `pg_dump` in containers. Start Docker Desktop and rerun. |
| `pnpm deploy:web` fails with `ERR_PNPM_INVALID_DEPLOY_TARGET` | `pnpm deploy` is a built-in pnpm command; the root script must call `pnpm --filter @timefraim/web run deploy`. |
| Browser CORS error on the workers.dev origin | The origin is missing from the `APP_ORIGIN` secret, or the SPA was built with a stale `.env.production` (`VITE_*` values are baked at build time — rebuild). |
| Login redirect lands on localhost | The workers.dev origin is not in the Supabase Auth URL configuration (Site URL / Redirect URLs). |
| Stored Toggl/Google tokens fail to decrypt | `INTEGRATION_ENCRYPTION_KEY` on the edge differs from the key used when they were saved. |
| `supabase` CLI reports a missing `supabase-go` binary | A stale standalone shim is earlier on `PATH` than the npm-installed CLI. Remove the shim or reorder `PATH`. |
