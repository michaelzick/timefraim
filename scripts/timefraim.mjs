#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appContainer = "timefraim-app-sandbox";
const appImage = "node:24-bookworm";

const args = process.argv.slice(2);

if (args[0] !== "sandbox") {
  printHelp();
  process.exit(args.length === 0 ? 0 : 1);
}

switch (args[1]) {
  case "start":
    await startSandbox();
    break;
  case "stop":
    stopSandbox();
    break;
  case "status":
    statusSandbox();
    break;
  default:
    printHelp();
    process.exit(1);
}

async function startSandbox() {
  requireCommand("docker", ["--version"]);
  requireCommand("supabase", ["--version"]);

  run("supabase", ["start"]);
  run("docker", ["rm", "-f", appContainer], { allowFailure: true });

  const child = spawn("docker", dockerRunArgs(), {
    cwd: repoRoot,
    stdio: "inherit",
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  const exitCode = await new Promise((resolveExit) => {
    child.on("exit", (code, signal) => {
      if (signal) {
        resolveExit(128);
        return;
      }
      resolveExit(code ?? 1);
    });
  });

  process.exit(exitCode);
}

function stopSandbox() {
  run("docker", ["rm", "-f", appContainer], { allowFailure: true });
  run("supabase", ["stop"]);
}

function statusSandbox() {
  run("docker", ["ps", "--filter", `name=${appContainer}`]);
  run("supabase", ["status"], { allowFailure: true });
}

function dockerRunArgs() {
  return [
    "run",
    "--rm",
    "--name",
    appContainer,
    "-p",
    "5173:5173",
    "-p",
    "4000:4000",
    "--env-file",
    ".env",
    "-e",
    "HOST=0.0.0.0",
    "-e",
    "PORT=4000",
    "-e",
    "DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:55332/postgres",
    "-e",
    "SUPABASE_URL=http://host.docker.internal:55331",
    "-e",
    "API_BASE_URL=http://127.0.0.1:4000",
    "-e",
    "VITE_API_BASE_URL=http://127.0.0.1:4000",
    "-e",
    "VITE_SUPABASE_URL=http://127.0.0.1:55331",
    "-e",
    "VITE_APP_ORIGIN=http://127.0.0.1:5173",
    "-e",
    "APP_ORIGIN=http://127.0.0.1:5173,http://localhost:5173",
    "--add-host",
    "host.docker.internal:host-gateway",
    "-v",
    `${repoRoot}:/workspace`,
    "-v",
    "timefraim_root_node_modules:/workspace/node_modules",
    "-v",
    "timefraim_web_node_modules:/workspace/apps/web/node_modules",
    "-v",
    "timefraim_server_node_modules:/workspace/apps/server/node_modules",
    "-v",
    "timefraim_shared_node_modules:/workspace/packages/shared/node_modules",
    "-v",
    "timefraim_pnpm_store:/pnpm/store",
    "-w",
    "/workspace",
    appImage,
    "bash",
    "-lc",
    [
      "set -e",
      "corepack enable",
      "corepack prepare pnpm@10.11.0 --activate",
      "pnpm config set store-dir /pnpm/store",
      "pnpm install --frozen-lockfile",
    ].join("; ") +
      "; pnpm --filter @timefraim/server dev & pnpm --filter @timefraim/web exec vite --host 0.0.0.0",
  ];
}

function requireCommand(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: "ignore",
  });

  if (result.status !== 0) {
    console.error(`Missing required command: ${command}`);
    process.exit(1);
  }
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (!options.allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printHelp() {
  console.log(`Usage:
  timefraim sandbox start   Start Supabase plus the web/API app container
  timefraim sandbox stop    Stop the sandbox containers
  timefraim sandbox status  Show sandbox container status

Package script aliases:
  pnpm sandbox:start
  pnpm sandbox:stop
  pnpm sandbox:status`);
}
