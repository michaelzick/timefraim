import { Hono } from "hono";
import { apiRoutes } from "../../../apps/server/src/http/routes.ts";
import { PlannerService } from "../../../apps/server/src/services/planner-service.ts";
import { jsonResponse, mountApiRoutes } from "../_shared/api-app.ts";
import { withCors } from "../_shared/cors.ts";

// Supabase serves this function at /functions/v1/api and passes the function
// name through as the pathname prefix, so requests arrive as /api/... and the
// Fastify route table mounts verbatim.
const app = new Hono();
app.use("*", withCors());
mountApiRoutes(app, apiRoutes, new PlannerService());
app.notFound(() =>
  jsonResponse({ code: "not_found", message: "Route not found", requestId: crypto.randomUUID() }, 404, "")
);

Deno.serve(app.fetch);
