import type { FastifyInstance } from "fastify";
import type { ApiRoute, RequestContext } from "./api-routes.ts";
import { requireAuthenticatedUser } from "./auth.ts";
import { sendMappedError, setRequestIdHeader } from "./http-errors.ts";
import { apiRoutes } from "./routes.ts";
import type { PlannerService } from "../services/planner-service.ts";

export function registerHttpRoutes(
  app: FastifyInstance,
  service: PlannerService,
  routes: ApiRoute[] = apiRoutes,
) {
  for (const route of routes) {
    app.route({
      method: route.method,
      url: route.path,
      handler: async (request, reply) => {
        setRequestIdHeader(reply, request);
        try {
          const context: RequestContext = {
            params: request.params as Record<string, string | undefined>,
            query: request.query,
            body: request.body,
          };
          if (route.auth === "none") {
            return await route.handler(context, service);
          }
          const user = await requireAuthenticatedUser(request.headers.authorization);
          return await route.handler({ ...context, user }, service);
        } catch (error) {
          return sendMappedError(request, reply, error);
        }
      },
    });
  }
}
