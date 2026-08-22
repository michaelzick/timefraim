import type { Hono } from "hono";
import { getErrorResponse } from "../../../apps/server/src/http/api-errors.ts";
import type { ApiRoute, RequestContext } from "../../../apps/server/src/http/api-routes.ts";
import { requireAuthenticatedUser } from "../../../apps/server/src/http/auth.ts";
import { invalidInput } from "../../../apps/server/src/services/planner-errors.ts";
import type { PlannerService } from "../../../apps/server/src/services/planner-service.ts";

export function jsonResponse(body: unknown, status: number, requestId: string) {
  return new Response(JSON.stringify(body ?? null), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-request-id": requestId,
    },
  });
}

async function readJsonBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }
  const text = await request.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw invalidInput("Request body must be valid JSON");
  }
}

// Hono counterpart of apps/server/src/http/fastify-adapter.ts: same route
// table, same bearer auth, same error envelope ({ code, message, requestId }).
export function mountApiRoutes(app: Hono, routes: ApiRoute[], service: PlannerService) {
  for (const route of routes) {
    app.on(route.method, route.path, async (c) => {
      const requestId = crypto.randomUUID();
      try {
        const context: RequestContext = {
          params: c.req.param(),
          query: c.req.query(),
          body: await readJsonBody(c.req.raw),
        };
        const result = route.auth === "none"
          ? await route.handler(context, service)
          : await route.handler(
            { ...context, user: await requireAuthenticatedUser(c.req.header("authorization")) },
            service,
          );
        return jsonResponse(result, 200, requestId);
      } catch (error) {
        const { code, message, status } = getErrorResponse(error);
        if (code === "internal_error") {
          console.error(`[${requestId}] Unhandled route error`, error);
        }
        return jsonResponse({ code, message, requestId }, status, requestId);
      }
    });
  }
}
