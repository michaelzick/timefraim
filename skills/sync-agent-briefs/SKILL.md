---
name: sync-agent-briefs
description: Sync the repo's agent-orientation files after structural or meaningful codebase changes. Use when commands, workflows, integrations, environment variables, architecture, layout, or other durable project facts change, or when finalizing meaningful work that may require AGENTS.md, CLAUDE.md, and GEMINI.md updates.
---

# Sync Agent Briefs

Use this skill for durable repo changes, not session notes. Typical triggers:

- top-level layout, packages, routes, integrations, MCP tools, or key files changed
- root scripts, CI behavior, lint/typecheck policy, or completion workflow changed
- environment variables, setup steps, or operating conventions changed

## Workflow

1. Read the relevant code changes and decide whether the repo brief is now stale.
2. Make the durable documentation edits in `AGENTS.md` first. Treat it as the canonical source.
3. Run `pnpm agent-briefs:sync` from the repo root to regenerate `CLAUDE.md` and `GEMINI.md`.
4. Run `pnpm agent-briefs:check` to confirm the three files are synchronized.
5. Before marking the work done, run `pnpm lint` and `pnpm typecheck`.

## Rules

- Do not mark work done while `pnpm lint` or `pnpm typecheck` fail.
- For broader validation or PR-ready work, prefer `pnpm check`.
- Keep the three orientation files semantically aligned. Harness-specific label lines are the only intended differences.
- Do not add ephemeral TODOs, debugging notes, or session history to these files.
