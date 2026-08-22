import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Node-only bootstrap: loads `.env` before config/env.ts evaluates. Import it
// first from index.ts (and from the vitest setup); edge functions receive their
// environment from Supabase secrets and never import this module.

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
