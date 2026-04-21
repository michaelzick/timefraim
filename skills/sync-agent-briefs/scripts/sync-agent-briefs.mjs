import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const sourcePath = resolve(repoRoot, "AGENTS.md");
const checkMode = process.argv.includes("--check");

const sourceTitle = "# TimeFraim — Agent Orientation (Codex / AGENTS.md)";
const sourceSiblingLine =
  "Sibling files [CLAUDE.md](CLAUDE.md) (Claude Code) and [GEMINI.md](GEMINI.md) (Gemini CLI) mirror this content for other harnesses. Update all three together when code structure changes.";

const targets = [
  {
    path: resolve(repoRoot, "CLAUDE.md"),
    title: "# TimeFraim — Agent Orientation (Claude Code)",
    siblingLine:
      "Sibling files [AGENTS.md](AGENTS.md) (Codex) and [GEMINI.md](GEMINI.md) (Gemini CLI) mirror this content for other harnesses. Update all three together when code structure changes.",
  },
  {
    path: resolve(repoRoot, "GEMINI.md"),
    title: "# TimeFraim — Agent Orientation (Gemini CLI)",
    siblingLine:
      "Sibling files [CLAUDE.md](CLAUDE.md) (Claude Code) and [AGENTS.md](AGENTS.md) (Codex) mirror this content for other harnesses. Update all three together when code structure changes.",
  },
];

function replaceOnce(content, from, to) {
  if (!content.includes(from)) {
    throw new Error(`Missing expected source text: ${from}`);
  }

  return content.replace(from, to);
}

function buildTargetContent(sourceContent, target) {
  return replaceOnce(
    replaceOnce(sourceContent, sourceTitle, target.title),
    sourceSiblingLine,
    target.siblingLine,
  );
}

const sourceContent = readFileSync(sourcePath, "utf8");
const mismatches = [];

for (const target of targets) {
  const expected = buildTargetContent(sourceContent, target);
  const current = readFileSync(target.path, "utf8");

  if (current === expected) {
    continue;
  }

  if (checkMode) {
    mismatches.push(target.path);
    continue;
  }

  writeFileSync(target.path, expected);
  console.log(`Updated ${target.path}`);
}

if (checkMode && mismatches.length > 0) {
  console.error("Agent brief files are out of sync:");
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  process.exitCode = 1;
}
