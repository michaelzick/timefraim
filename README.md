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

4. Copy values from local Supabase into `.env`:

   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`

5. Add Google OAuth credentials and optional Toggl workspace details to `.env`.

6. Run the web app and backend:

   ```bash
   pnpm dev
   ```

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm check`
