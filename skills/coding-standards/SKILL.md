---
name: coding-standards
description: Apply portable production standards for modern Node, React, and TypeScript code. Use before implementation, refactors, API work, UI state handling, error handling, persistence changes, security-sensitive code, performance-sensitive code, tests, and code reviews.
---

# Coding Standards

## Purpose

This guide defines coding and architecture standards for modern Node, React, and TypeScript applications. Treat it as a portable baseline for production web apps: it should help an engineer make code that is clear, testable, resilient, secure, and efficient without depending on project-specific details.

## Core Principles

- Optimize for understandable behavior before clever implementation. A teammate should be able to predict what a module does from its public API, tests, and file location.
- Keep dependency direction simple. UI depends on hooks and client APIs; client APIs depend on transport helpers and shared types; server routes depend on validation, services, persistence, and infrastructure. Lower-level modules must not import UI code.
- Prefer explicit data contracts over implicit object shapes. Model inputs, outputs, and failure cases with TypeScript types and runtime validation at trust boundaries.
- Make failure ordinary. Network errors, invalid input, unavailable dependencies, stale requests, and empty states should be expected paths with clear behavior.
- Measure before optimizing, but write code with reasonable time, space, and bundle costs from the start.

## Architecture Boundaries

- Separate domain logic from framework glue. Keep calculations, validation, transformations, and policy decisions in pure functions where practical; call them from React components or Node handlers.
- Keep route handlers thin. A server route should validate input, call the relevant service or persistence function, map known errors to HTTP responses, and return typed output.
- Keep React components focused on rendering and interaction. Move reusable data loading, persistence, and state transitions into hooks or small helpers.
- Avoid circular dependencies. Shared types and pure utilities may sit at the bottom of the graph; feature modules should not reach across unrelated features for internal helpers.
- Prefer composition over global state. Use module state only for stable singletons such as a database connection, telemetry client, or feature flag client, and provide shutdown cleanup when needed.

## TypeScript Standards

- Run with `strict` TypeScript. Avoid `any`; use `unknown` at boundaries and narrow it with validation.
- Use discriminated unions for state machines and known failure modes. Example states: `idle`, `loading`, `success`, `empty`, `error`.
- Keep public types stable and small. Avoid exporting internal helper types unless another module genuinely needs them.
- Use runtime schemas for external input: HTTP request bodies, query strings, local storage, environment variables, third-party webhooks, and imported files.
- Prefer `type` for unions and mapped types; use `interface` when declaration merging or object extension is useful.
- Do not silence type errors with broad casts. If a cast is unavoidable, place it near a validation boundary and explain why it is safe.

## React Standards

- Render the real application screen first. Avoid building placeholder or marketing surfaces when the product needs a working app experience.
- Keep components pure during render. Do not start network calls, timers, subscriptions, storage writes, or DOM mutations in render.
- Clean up effects. Abort fetches, clear timers, unsubscribe listeners, and ignore stale async results during cleanup.
- Keep effect dependencies accurate. If an effect becomes hard to reason about, extract a stable helper or reducer rather than suppressing dependency warnings.
- Use `React.lazy` and `Suspense` for route-level code splitting when pages pull in heavy libraries, charts, editors, maps, or rarely used workflows.
- Use memoization only when it prevents meaningful work or stabilizes an expensive child. `useMemo` and `useCallback` are not substitutes for simple data flow.
- Keep state local by default. Lift state only when multiple components need to coordinate; use URL state for navigable filters and selections.
- Make loading, empty, error, and retry states first-class UI. A failed fetch should not leave the user staring at a spinner forever.
- Build accessible controls: semantic buttons and links, labels for inputs, visible focus states, keyboard navigation, and useful `aria-label` text where visible text is insufficient.

## Node and API Standards

- Validate all request bodies, query parameters, route params, headers, cookies, and webhook payloads before use.
- Return structured errors with stable error codes where clients need to react programmatically. Do not leak stack traces, SQL details, secrets, or internal service names.
- Use appropriate HTTP status codes: `400` for invalid input, `401` for unauthenticated, `403` for unauthorized, `404` for absent or hidden resources, `409` for conflicts, `429` for rate limits, and `5xx` for server failures.
- Add request IDs or correlation IDs to logs and responses so client reports can be tied to server traces.
- Make writes idempotent where retries are expected. Use idempotency keys, unique constraints, transactions, or deduplication records.
- Close resources gracefully on shutdown: HTTP servers, database pools, queues, file watchers, telemetry exporters, and background jobs.
- Set timeouts for outbound calls. A dependency that never answers should degrade predictably instead of exhausting workers.
- Treat background work as at-least-once unless the queue guarantees otherwise. Handlers must tolerate retries and duplicate messages.

## Graceful Failure Handling

- Classify failures before handling them: validation, authentication, authorization, not found, conflict, rate limit, dependency unavailable, timeout, and unknown.
- Prefer typed or named errors for expected failures. Reserve generic exceptions for unexpected defects.
- In the UI, show a human-readable message and a recovery path when possible: retry, edit input, refresh, or contact support.
- In the server, log enough context to debug the failure without recording sensitive data.
- Do not catch errors only to hide them. Either handle the failure completely, translate it into a known error, or rethrow.
- Avoid unhandled promise rejections. Every async effect, event handler, route, and background job should have an explicit failure path.

## Memory Management

- Abort stale fetches when components unmount or inputs change. Ignoring old responses prevents state updates after unmount and reduces wasted work.
- Clear timers and intervals in effect cleanup. Long-running timers retain closures and can keep stale state alive.
- Remove event listeners and subscriptions using the same target and handler reference used to register them.
- Avoid storing large response objects, files, DOM nodes, or chart data in long-lived global state unless needed.
- Stream or paginate large datasets. Do not load all rows into memory when the user only needs a page, summary, or filtered subset.
- Prefer immutable updates for React state, but avoid excessive deep copies of large nested objects. Normalize or index data when updates are frequent.
- Close database connections, file handles, workers, and browser resources during tests and process shutdown.

## Performance and Complexity

- Know the Big O cost of hot paths. A nested loop over small static lists is fine; a nested loop over user data or database rows needs scrutiny.
- Choose data structures intentionally. Use `Map` or `Set` for repeated lookup, deduplication, and membership checks instead of repeated linear scans.
- Push filtering, sorting, pagination, and aggregation to the database when the dataset can grow beyond memory-friendly limits.
- Limit network waterfalls. Fetch independent resources in parallel and cache stable reference data where appropriate.
- Split large bundles by route and feature. Heavy charting, map, editor, PDF, spreadsheet, or visualization libraries should not block first render for unrelated pages.
- Watch bundle output. Treat unexpectedly large chunks as a signal to lazy-load, replace dependencies, or configure manual chunks.
- Avoid premature memoization. First reduce unnecessary renders through clean state boundaries, stable keys, and moving derived data near its source.
- Profile before complex optimization. Use browser performance tools, server timing, query plans, and production telemetry to confirm bottlenecks.

## Data and Persistence

- Keep database schemas aligned with access patterns. Add indexes for common filters, joins, and sort orders.
- Enforce invariants in the database when possible: primary keys, unique constraints, foreign keys, checks, and not-null columns.
- Use transactions for multi-step writes that must commit or fail together.
- Store timestamps consistently, preferably in ISO 8601 UTC unless the project has a stronger convention.
- Keep migrations deterministic and reversible when practical. Avoid migrations that depend on external services or local machine state.
- Separate seed/demo content from user-generated data so sync operations do not accidentally delete learner or customer state.

## Security and Privacy

- Treat all client input as untrusted, even if it came from your own UI.
- Authorize on the server for every sensitive read and write. Client-side route guards are user experience, not security.
- Store secrets only in environment or secret managers. Never commit `.env` files, API keys, tokens, private certificates, or production dumps.
- Sanitize logs. Do not log passwords, tokens, session cookies, private health data, payment data, or full request bodies by default.
- Use secure defaults: HTTPS in production, secure cookies, CSRF protection where relevant, strict CORS allowlists, and least-privilege service credentials.
- Validate file uploads by size, type, checksum, scan status, and authorization. Do not make private object storage public to simplify downloads.

## Commenting Standards

- Comment intent, invariants, tradeoffs, and surprising behavior. Do not narrate obvious syntax.
- Keep comments close to the code they explain and update them in the same change as the code.
- Prefer clear names and small functions over comments that compensate for tangled logic.
- Document public APIs, non-obvious performance choices, security decisions, and migration assumptions.
- Remove stale comments. Incorrect documentation is worse than missing documentation.

## Testing Standards

- Test behavior, not implementation details. A test should describe what the user, API client, or caller observes.
- Cover success paths, validation failures, not-found cases, authorization boundaries, network failures, empty states, and retry/idempotency behavior.
- Keep pure logic tests fast and exhaustive. Use table tests for calculations, parsers, reducers, and branching helpers.
- Use integration tests for server routes, persistence, routing, and feature workflows where modules must cooperate.
- Mock the network at the app boundary, not deep inside a feature, unless the lower-level dependency is the unit under test.
- Make async tests deterministic. Control timers, await visible outcomes, and avoid arbitrary sleeps.
- Keep coverage thresholds meaningful. High coverage is useful only when tests assert important behavior and failure modes.
- Run typecheck, unit tests, coverage, and production build in CI for every pull request.

## Review Checklist

- The code has a clear owner module and does not violate dependency direction.
- Inputs are validated and outputs match shared contracts.
- Loading, empty, error, retry, and success states are handled.
- Effects, timers, listeners, requests, database handles, and servers clean up after themselves.
- Hot paths use reasonable data structures and avoid unnecessary O(n^2) work.
- Large or rare UI features are code split.
- Tests cover the intended behavior and the important failure modes.
- Logs and errors are useful without exposing sensitive data.
- Comments explain why, not what.
