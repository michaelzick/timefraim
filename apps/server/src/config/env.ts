import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// The bundled output lives at a different depth than src/config, so locate
// the repo root by marker file instead of a fixed number of parent hops.
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  while (!existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      return startDir;
    }
    dir = parent;
  }
  return dir;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(currentDir);

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(repoRoot, ".env"),
];

for (const path of new Set(envCandidates)) {
  dotenv.config({ path, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default("127.0.0.1"),
  APP_ORIGIN: z
    .string()
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  API_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
  ALLOWED_EMAIL: z.string().email(),
  MCP_BEARER_TOKEN: z.string().min(1),
  MCP_READ_ONLY_TOKEN: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  GOOGLE_PLANNER_CALENDAR_ID: z.string().default("Free Time Tasks"),
  TUNNEL_PUBLIC_BASE_URL: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);
