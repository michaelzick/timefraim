import { userPreferencesUpdateSchema } from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import { parseWithReply, withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerPreferencesRoutes(app: FastifyInstance, plannerService: PlannerService) {
  app.get(
    "/api/preferences",
    withAuthenticatedRoute(async (_request, _reply, user) => plannerService.getUserPreferences(user.id)),
  );

  app.put(
    "/api/preferences",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, userPreferencesUpdateSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.saveUserPreferences(user.id, payload);
    }),
  );
}
