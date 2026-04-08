type AppEnvKey =
  | "VITE_ALLOWED_EMAIL"
  | "VITE_API_BASE_URL"
  | "VITE_SUPABASE_ANON_KEY"
  | "VITE_SUPABASE_URL";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const rawEnv: unknown = import.meta.env;

if (!isRecord(rawEnv)) {
  throw new Error("Vite env is unavailable in this runtime.");
}

const envSource = rawEnv;

function readEnv(name: AppEnvKey): string {
  const value = envSource[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required Vite env var: ${name}`);
  }
  return value;
}

export const env = {
  allowedEmail: readEnv("VITE_ALLOWED_EMAIL").toLowerCase(),
  apiBaseUrl: readEnv("VITE_API_BASE_URL").replace(/\/$/, ""),
  supabaseAnonKey: readEnv("VITE_SUPABASE_ANON_KEY"),
  supabaseUrl: readEnv("VITE_SUPABASE_URL"),
} as const;
