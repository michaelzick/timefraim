import { authSessionSchema } from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import { withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerAuthRoutes(app: FastifyInstance, plannerService: PlannerService) {
  app.get("/health", () => ({ ok: true }));

  app.get(
    "/api/auth/me",
    withAuthenticatedRoute(async (_request, _reply, user) =>
      authSessionSchema.parse({
        user,
        integrationStatus: await plannerService.getIntegrationStatus(),
      }),
    ),
  );
}
