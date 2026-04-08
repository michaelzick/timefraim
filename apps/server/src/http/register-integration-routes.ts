import { googleConnectSchema, togglConnectSchema } from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import { parseWithReply, withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerIntegrationRoutes(app: FastifyInstance, plannerService: PlannerService) {
  app.get(
    "/api/integrations/status",
    withAuthenticatedRoute(async () => plannerService.getIntegrationStatus()),
  );

  app.post(
    "/api/integrations/google/session",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, googleConnectSchema, request.body);
      if (!payload) {
        return null;
      }
      if (payload.email.toLowerCase() !== user.email.toLowerCase()) {
        reply.status(403).send({ message: "Google session must belong to the signed-in account" });
        return null;
      }

      return plannerService.saveGoogleSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken ?? null,
        expiresAt: payload.expiresAt ?? null,
        email: payload.email,
        calendarId: payload.calendarId,
      });
    }),
  );

  app.post(
    "/api/integrations/toggl/connect",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, togglConnectSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.saveTogglConnection({
        apiToken: payload.apiToken,
        workspaceId: payload.workspaceId,
        defaultProjectId: payload.defaultProjectId ?? null,
      });
    }),
  );
}
