#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(repoRoot, ".env");
const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  printHelp();
  process.exit(0);
}

const fileEnv = loadEnvFile(envFile);
const baseEnv = { ...fileEnv, ...process.env };
const linkedEnv = resolveLinkedEnv(baseEnv);
const childEnv = {
  ...baseEnv,
  DATABASE_URL: linkedEnv.postgresUrl,
  SUPABASE_URL: linkedEnv.supabaseUrl,
  SUPABASE_ANON_KEY: linkedEnv.publishableKey,
  SUPABASE_SERVICE_ROLE_KEY: linkedEnv.serviceRoleKey,
  SUPABASE_JWT_SECRET: linkedEnv.jwtSecret,
  VITE_SUPABASE_URL: linkedEnv.supabaseUrl,
  VITE_SUPABASE_ANON_KEY: linkedEnv.publishableKey,
};

console.log("Starting TimeFraim against linked Supabase");
console.log(`  Supabase URL: ${linkedEnv.supabaseUrl}`);
console.log(`  Postgres host: ${postgresHost(linkedEnv.postgresUrl)}`);
console.log(`  Web: ${childEnv.VITE_APP_ORIGIN ?? "http://127.0.0.1:6173"}`);
console.log(`  API: ${childEnv.API_BASE_URL ?? "http://127.0.0.1:4000"}`);
if (!linkedEnv.hasJwtSecret) {
  console.warn("");
  console.warn("Warning: LINKED_SUPABASE_JWT_SECRET is not configured.");
  console.warn("The app can still start, and auth may work if linked access tokens use JWKS signing.");
  console.warn("If API requests return 401 after login, add the linked project's JWT secret to .env.");
}

if (args.has("--check")) {
  process.exit(0);
}

const child = spawn("corepack", ["pnpm", "dev"], {
  cwd: repoRoot,
  env: childEnv,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(128);
    return;
  }
  process.exit(code ?? 1);
});

function resolveLinkedEnv(env) {
  const required = {
    postgresUrl: "LINKED_SUPABASE_POSTGRES_URL",
    publishableKey: "LINKED_SUPABASE_PUBLISHABLE_KEY",
    serviceRoleKey: "LINKED_SUPABASE_SERVICE_ROLE_KEY",
    supabaseUrl: "LINKED_SUPABASE_URL",
  };

  const resolved = Object.fromEntries(
    Object.entries(required).map(([key, name]) => [key, env[name]]),
  );
  const missing = Object.entries(required)
    .filter(([key]) => !isConfigured(resolved[key]))
    .map(([, name]) => name);

  if (missing.length > 0) {
    console.error("Missing linked Supabase env vars:");
    for (const name of missing) {
      console.error(`  - ${name}`);
    }
    console.error("");
    console.error("Add them to .env or prefix this command with the missing values.");
    console.error("LINKED_SUPABASE_JWT_SECRET is optional unless linked access tokens are HS256-signed.");
    process.exit(1);
  }

  validateUrl("LINKED_SUPABASE_URL", resolved.supabaseUrl);
  validateUrl("LINKED_SUPABASE_POSTGRES_URL", resolved.postgresUrl);

  return {
    ...resolved,
    hasJwtSecret: isConfigured(env.LINKED_SUPABASE_JWT_SECRET),
    jwtSecret: isConfigured(env.LINKED_SUPABASE_JWT_SECRET)
      ? env.LINKED_SUPABASE_JWT_SECRET
      : "linked-supabase-jwt-secret-not-configured",
  };
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/u)
      .map(parseEnvLine)
      .filter((entry) => entry !== null),
  );
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }

  const withoutExport = trimmed.startsWith("export ") ? trimmed.slice(7).trimStart() : trimmed;
  const separatorIndex = withoutExport.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  const key = withoutExport.slice(0, separatorIndex).trim();
  const rawValue = withoutExport.slice(separatorIndex + 1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
    return null;
  }

  return [key, unwrapEnvValue(rawValue)];
}

function unwrapEnvValue(value) {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value.at(-1);
  if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}

function isConfigured(value) {
  return typeof value === "string"
    && value.trim().length > 0
    && !value.startsWith("replace-with-");
}

function validateUrl(name, value) {
  try {
    new URL(value);
  } catch {
    console.error(`${name} must be a valid URL.`);
    process.exit(1);
  }
}

function postgresHost(postgresUrl) {
  try {
    const url = new URL(postgresUrl);
    return url.host;
  } catch {
    return "(configured)";
  }
}

function printHelp() {
  console.log(`Usage:
  pnpm dev:linked
  pnpm dev:linked -- --check

Starts the web and API dev servers with LINKED_SUPABASE_* values mapped onto
the runtime env vars that TimeFraim already reads.`);
}
