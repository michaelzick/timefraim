#!/usr/bin/env node
// Serves the Supabase edge functions locally with the repo .env, minus the
// values the edge runtime injects itself or that only make sense on the host
// (the runtime runs in a container, so 127.0.0.1 database URLs do not resolve).
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repoRoot, ".env");
const target = path.join(repoRoot, "supabase", ".env.functions");

const DROP = new Set(["DATABASE_URL", "PORT", "HOST", "API_BASE_URL", "NODE_ENV"]);
const RENAME = new Map([["SUPABASE_JWT_SECRET", "AUTH_JWT_SECRET"]]);

const lines = readFileSync(source, "utf8").split(/\r?\n/).flatMap((line) => {
  const match = /^([A-Z0-9_]+)=/.exec(line);
  if (!match) {
    return [];
  }
  const name = match[1];
  if (DROP.has(name) || (name.startsWith("SUPABASE_") && !RENAME.has(name))) {
    return [];
  }
  const renamed = RENAME.get(name);
  return [renamed ? line.replace(`${name}=`, `${renamed}=`) : line];
});

writeFileSync(target, `${lines.join("\n")}\n`);
const result = spawnSync("supabase", ["functions", "serve", "--env-file", target], {
  cwd: repoRoot,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
