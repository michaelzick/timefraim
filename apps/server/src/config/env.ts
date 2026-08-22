import { z } from "zod";

type EnvRecord = Record<string, string | undefined>;

type RuntimeGlobals = {
  Deno?: { env: { toObject(): Record<string, string> } };
  process?: { env: EnvRecord };
};

// Shared by the Node server and the Deno edge functions, so it reads whichever
// runtime environment exists instead of importing node:process. Node loads
// `.env` beforehand via ./load-dotenv.ts (index.ts and the vitest setup).
function readRuntimeEnv(): EnvRecord {
  const globals = globalThis as RuntimeGlobals;
  if (globals.Deno) {
    return globals.Deno.env.toObject();
  }
  return globals.process?.env ?? {};
}

const optionalString = z.string().min(1).optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().min(1).default("127.0.0.1"),
    APP_ORIGIN: z
      .string()
      .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
    // Edge functions inject SUPABASE_DB_URL; an explicit DATABASE_URL wins.
    DATABASE_URL: optionalString,
    SUPABASE_DB_URL: optionalString,
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: optionalString,
    SUPABASE_SERVICE_ROLE_KEY: optionalString,
    // Supabase rejects secrets named SUPABASE_*, so edge deployments provide
    // the HS256 verification secret as AUTH_JWT_SECRET instead.
    SUPABASE_JWT_SECRET: optionalString,
    AUTH_JWT_SECRET: optionalString,
    INTEGRATION_ENCRYPTION_KEY: z.string().optional(),
    ALLOWED_EMAIL: z.string().email(),
    MCP_BEARER_TOKEN: z.string().min(1),
    MCP_READ_ONLY_TOKEN: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().optional().default(""),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
    GOOGLE_CALENDAR_ID: z.string().default("primary"),
    GOOGLE_PLANNER_CALENDAR_ID: z.string().default("Free Time Tasks"),
    TUNNEL_PUBLIC_BASE_URL: z.string().optional().default(""),
  })
  .transform(({ SUPABASE_DB_URL, AUTH_JWT_SECRET, ...rest }) => ({
    ...rest,
    DATABASE_URL: rest.DATABASE_URL ?? SUPABASE_DB_URL ?? "",
    SUPABASE_JWT_SECRET: rest.SUPABASE_JWT_SECRET ?? AUTH_JWT_SECRET ?? "",
  }))
  .refine((value) => value.DATABASE_URL.length > 0, {
    message: "DATABASE_URL (or SUPABASE_DB_URL) is required",
    path: ["DATABASE_URL"],
  });

export const env = envSchema.parse(readRuntimeEnv());
