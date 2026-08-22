import { authSessionSchema } from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import { withAuthenticatedRoute } from "./route-helpers.ts";
import type { PlannerService } from "../services/planner-service.ts";

export function registerAuthRoutes(app: FastifyInstance, plannerService: PlannerService) {
  app.get("/health", () => ({ ok: true }));

  app.get(
    "/api/auth/me",
    withAuthenticatedRoute(async (_request, _reply, user) =>
      authSessionSchema.parse({
        user,
        integrationStatus: await plannerService.getIntegrationStatus(user.id),
      }),
    ),
  );
}
