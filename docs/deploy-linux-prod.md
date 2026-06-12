# Production deploy: Linux + nginx, accessed via SSH tunnel

Instructions for a coding agent (Claude) deploying TimeFraim as a **production build** on a Linux server. The app is reached from the user's machine through an SSH tunnel — nothing is exposed publicly. Follow the steps in order; each has a verification command.

## Architecture

```
Browser (user's machine)
  └─ http://127.0.0.1:6173
       └─ SSH tunnel (ssh -L 6173:127.0.0.1:6173 user@server)
            └─ nginx on server loopback :6173
                 ├─ serves apps/web/dist (static SPA, built by Vite)
                 └─ proxies /api/*, /health, /mcp → Fastify on loopback :4000
                      └─ hosted Supabase (auth + Postgres via IPv4 session pooler)
```

Key properties:
- **Everything binds loopback only** (`127.0.0.1`). The SSH tunnel terminates on the server's loopback, so no firewall holes and no TLS needed.
- **Single tunneled port.** nginx serves the SPA and proxies the API on the same origin, so the browser origin (`http://127.0.0.1:6173`) matches what's already allowlisted in hosted Supabase auth and in `APP_ORIGIN` — Google login keeps working unchanged.
- **`NODE_ENV=production`** works because `APP_ORIGIN` lists the real browser origin. Do not "fix" CORS errors by switching back to `development`; fix `APP_ORIGIN` instead.

## 1. Prerequisites

```bash
# Node >= 24 (repo engines field requires it) + corepack
node --version          # must be >= 24
corepack enable

# nginx
sudo apt-get install -y nginx   # or distro equivalent

# Clone and install (dev deps are needed to build)
git clone <repo-url> /opt/timefraim
cd /opt/timefraim
corepack pnpm install
```

## 2. Write the server `.env`

Create `/opt/timefraim/.env` (it is gitignored — never commit it). Copy the secret values from the user's local `.env`; the table shows which local value each prod var maps to.

```bash
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
# The origin the browser actually uses through the tunnel:
APP_ORIGIN=http://127.0.0.1:6173,http://localhost:6173
API_BASE_URL=http://127.0.0.1:6173
MCP_BEARER_TOKEN=<same as local>
MCP_READ_ONLY_TOKEN=<same as local>
ALLOWED_EMAIL=<same as local>

# Hosted ("linked") Supabase project — copy from the LINKED_SUPABASE_* values
# in the local .env. There is no local Supabase stack in production.
SUPABASE_URL=<LINKED_SUPABASE_URL>
SUPABASE_ANON_KEY=<LINKED_SUPABASE_PUBLISHABLE_KEY>
SUPABASE_SERVICE_ROLE_KEY=<LINKED_SUPABASE_SERVICE_ROLE_KEY>
SUPABASE_JWT_SECRET=<LINKED_SUPABASE_JWT_SECRET>
# MUST be the session pooler host (postgres.<ref>@aws-N-<region>.pooler.supabase.com:5432).
# The direct host db.<ref>.supabase.co is IPv6-only and unreachable from
# IPv4-only servers (fails with ENETUNREACH / connect timeout).
DATABASE_URL=<LINKED_SUPABASE_POSTGRES_URL>
# Must match the key used when Toggl/Google tokens were stored, or they
# become undecryptable:
INTEGRATION_ENCRYPTION_KEY=<same as local>

GOOGLE_CLIENT_ID=<same as local>
GOOGLE_CLIENT_SECRET=<same as local>
GOOGLE_CALENDAR_ID=primary
GOOGLE_PLANNER_CALENDAR_ID=Free Time Tasks

TUNNEL_PUBLIC_BASE_URL=

# Baked into the web bundle at build time (vite envDir = repo root).
# These are the tunnel-side URLs the BROWSER uses — keep them 127.0.0.1.
VITE_APP_ORIGIN=http://127.0.0.1:6173
VITE_API_BASE_URL=http://127.0.0.1:6173
VITE_SUPABASE_URL=<LINKED_SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<LINKED_SUPABASE_PUBLISHABLE_KEY>
VITE_ALLOWED_EMAIL=<same as ALLOWED_EMAIL>
```

Notes:
- `VITE_API_BASE_URL` is the **same origin as the app** because nginx proxies `/api` — no second tunneled port, no CORS preflights.
- If any `VITE_*` value changes later, the web app must be **rebuilt** (step 3); they are compile-time constants.
- The Supabase auth dashboard for the linked project must list `http://127.0.0.1:6173` as an allowed redirect URL. If the user already logged in through a tunnel with the dev server, this is already configured.

## 3. Build

```bash
cd /opt/timefraim
corepack pnpm build
```

This builds `packages/shared`, bundles the API into `apps/server/dist/index.js` (the shared package is bundled in — no runtime workspace resolution), and emits the SPA to `apps/web/dist`.

Verify: `ls apps/server/dist/index.js apps/web/dist/index.html`

## 4. Run the API (systemd)

Create `/etc/systemd/system/timefraim-api.service`:

```ini
[Unit]
Description=TimeFraim API
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/timefraim
ExecStart=/usr/bin/env corepack pnpm start:server
Restart=on-failure
RestartSec=3
# Adjust to the user that owns /opt/timefraim:
User=<deploy-user>

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now timefraim-api
```

Verify: `curl -s http://127.0.0.1:4000/health` → `{"ok":true}`

(For a quick foreground run instead of systemd: `corepack pnpm start:server` from the repo root.)

## 5. nginx

Create `/etc/nginx/sites-available/timefraim` (or `conf.d/timefraim.conf`):

```nginx
server {
    # Loopback only — reached exclusively through the SSH tunnel.
    listen 127.0.0.1:6173;

    root /opt/timefraim/apps/web/dist;
    index index.html;

    # SPA fallback for React Router routes (/board, /settings, ...)
    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    location = /health {
        proxy_pass http://127.0.0.1:4000;
    }

    # MCP uses streamable HTTP (long-lived/streaming responses) — no buffering.
    location = /mcp {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 1h;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/timefraim /etc/nginx/sites-enabled/timefraim
sudo nginx -t && sudo systemctl reload nginx
```

Verify from the server:
```bash
curl -s http://127.0.0.1:6173/health            # {"ok":true} (proxied)
curl -s http://127.0.0.1:6173/ | head -3        # index.html
curl -s http://127.0.0.1:6173/settings | head -3  # also index.html (SPA fallback)
```

## 6. SSH tunnel (user's machine)

```bash
ssh -N -L 6173:127.0.0.1:6173 <user>@<server>
```

Then browse **http://127.0.0.1:6173** (prefer `127.0.0.1` over `localhost` — it matches the baked `VITE_API_BASE_URL` exactly, keeping every request same-origin).

## 7. Post-deploy verification checklist

1. `curl http://127.0.0.1:6173/health` on the server returns `{"ok":true}`.
2. Browser loads the planner at `http://127.0.0.1:6173` through the tunnel.
3. Google login completes and returns to the app (Supabase redirect).
4. The day plan loads (proves API → pooler Postgres connectivity).
5. Deep-link a route (e.g. `/settings`) and hard-refresh — no 404 (SPA fallback).
6. `journalctl -u timefraim-api -n 50` shows no errors.

## 8. Updating a deployment

```bash
cd /opt/timefraim
git pull
corepack pnpm install
corepack pnpm build
sudo systemctl restart timefraim-api
# nginx serves the new apps/web/dist immediately; no reload needed.
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| API fails with `ENETUNREACH` / connect timeout to Postgres | `DATABASE_URL` points at `db.<ref>.supabase.co` (IPv6-only). Use the session pooler URL. |
| Browser CORS errors | The browser's origin is missing from `APP_ORIGIN`. Fix `APP_ORIGIN` and restart the API — do not set `NODE_ENV=development`. |
| `401` on every API call after login | `SUPABASE_JWT_SECRET` is not the linked project's secret (HS256 tokens), or the wrong `SUPABASE_URL` (JWKS lookup). |
| Login redirect lands on an error page | Tunnel origin not in the linked Supabase project's auth redirect allowlist. |
| Hard refresh on `/settings` gives nginx 404 | Missing `try_files $uri /index.html;` SPA fallback. |
| Stored Toggl/Google tokens fail to decrypt | `INTEGRATION_ENCRYPTION_KEY` differs from the key used when they were saved. |
| Changed a `VITE_*` var but the app ignores it | `VITE_*` is baked at build time — rerun `corepack pnpm build`. |
