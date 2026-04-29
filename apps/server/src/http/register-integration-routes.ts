import {
  googleCalendarSettingsUpdateSchema,
  googleConnectSchema,
  openAiConnectSchema,
  openAiImageGenerateSchema,
  togglConnectSchema,
  togglDiscoverInputSchema,
} from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import { AuthorizationError } from "./auth.js";
import { parseWithReply, withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerIntegrationRoutes(app: FastifyInstance, plannerService: PlannerService) {
  app.get(
    "/api/integrations/status",
    withAuthenticatedRoute(async (_request, _reply, user) => plannerService.getIntegrationStatus(user.id)),
  );

  app.get(
    "/api/integrations/toggl",
    withAuthenticatedRoute(async (_request, _reply, user) => plannerService.getTogglSettings(user.id)),
  );

  app.post(
    "/api/integrations/toggl/discover",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, togglDiscoverInputSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.discoverTogglConnection(payload);
    }),
  );

  app.get(
    "/api/integrations/openai",
    withAuthenticatedRoute(async () => plannerService.getOpenAiImageSettings()),
  );

  app.post(
    "/api/integrations/openai/connect",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, openAiConnectSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.saveOpenAiConnection(payload.apiKey);
    }),
  );

  app.delete(
    "/api/integrations/openai/connect",
    withAuthenticatedRoute(async () => plannerService.deleteOpenAiConnection()),
  );

  app.post(
    "/api/integrations/openai/images",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, openAiImageGenerateSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.generateOpenAiImage(payload.prompt);
    }),
  );

  app.post(
    "/api/integrations/google/session",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, googleConnectSchema, request.body);
      if (!payload) {
        return null;
      }
      if (payload.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new AuthorizationError("Google session must belong to the signed-in account");
      }

      return plannerService.saveGoogleSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken ?? null,
        expiresAt: payload.expiresAt ?? null,
        email: payload.email,
        calendarId: payload.calendarId,
        userId: user.id,
      });
    }),
  );

  app.get(
    "/api/integrations/google/calendars",
    withAuthenticatedRoute(async () => plannerService.getGoogleCalendarSettings()),
  );

  app.put(
    "/api/integrations/google/calendars",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, googleCalendarSettingsUpdateSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.saveGoogleCalendarSettings(payload);
    }),
  );

  app.post(
    "/api/integrations/toggl/connect",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, togglConnectSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.saveTogglConnection(user.id, {
        apiToken: payload.apiToken,
        workspaceId: payload.workspaceId,
        defaultProjectId: payload.defaultProjectId ?? null,
      });
    }),
  );

  app.delete(
    "/api/integrations/toggl/connect",
    withAuthenticatedRoute(async (_request, _reply, user) => plannerService.deleteTogglConnection(user.id)),
  );
}
