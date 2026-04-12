# TimeFraim

Single-user scheduling app scaffolded as a local-first Sunsama-style planner with:

- Vite + React + TypeScript + Tailwind + Radix + shadcn-style UI
- Fastify backend with draft-first scheduling APIs and a remote MCP endpoint
- Shared Zod contracts
- Local Supabase config pinned to host ports `55331` to `55337`

## Setup

1. Enable `pnpm` through Corepack:

   ```bash
   corepack prepare pnpm@10.11.0 --activate
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start local Supabase:

   ```bash
   supabase start
   supabase db reset
   ```

   If you already have local data and just need the latest schema changes, run:

   ```bash
   supabase migration up
   ```

4. Copy values from local Supabase into `.env`:

  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET`
  - `INTEGRATION_ENCRYPTION_KEY` (generate a long random secret, for example with `openssl rand -base64 32`)

5. Add Google OAuth credentials to `.env`.

6. Connect Toggl from Settings inside the app using a personal API token from <https://track.toggl.com/profile>. TimeFraim stores the token encrypted in the database and lets you choose a workspace, workspace default project, and per-task project overrides.

7. Run the web app and backend:

   ```bash
   pnpm dev
   ```

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm check`
