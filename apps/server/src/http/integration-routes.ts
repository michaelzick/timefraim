import {
  googleCalendarSettingsUpdateSchema,
  googleConnectSchema,
  togglConnectSchema,
  togglDiscoverInputSchema,
} from "@timefraim/shared";
import { parseOrThrow, type ApiRoute } from "./api-routes.ts";
import { AuthorizationError } from "./auth.ts";

export const integrationRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/integrations/status",
    handler: ({ user }, service) => service.getIntegrationStatus(user.id),
  },
  {
    method: "GET",
    path: "/api/integrations/toggl",
    handler: ({ user }, service) => service.getTogglSettings(user.id),
  },
  {
    method: "POST",
    path: "/api/integrations/toggl/discover",
    handler: ({ body }, service) =>
      service.discoverTogglConnection(parseOrThrow(togglDiscoverInputSchema, body)),
  },
  {
    method: "POST",
    path: "/api/integrations/google/session",
    handler: ({ user, body }, service) => {
      const payload = parseOrThrow(googleConnectSchema, body);
      if (payload.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new AuthorizationError("Google session must belong to the signed-in account");
      }

      return service.saveGoogleSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken ?? null,
        expiresAt: payload.expiresAt ?? null,
        email: payload.email,
        calendarId: payload.calendarId,
        userId: user.id,
      });
    },
  },
  {
    method: "GET",
    path: "/api/integrations/google/calendars",
    handler: (_context, service) => service.getGoogleCalendarSettings(),
  },
  {
    method: "PUT",
    path: "/api/integrations/google/calendars",
    handler: ({ body }, service) =>
      service.saveGoogleCalendarSettings(parseOrThrow(googleCalendarSettingsUpdateSchema, body)),
  },
  {
    method: "POST",
    path: "/api/integrations/toggl/connect",
    handler: ({ user, body }, service) => {
      const payload = parseOrThrow(togglConnectSchema, body);
      return service.saveTogglConnection(user.id, {
        apiToken: payload.apiToken,
        workspaceId: payload.workspaceId,
        defaultProjectId: payload.defaultProjectId ?? null,
      });
    },
  },
  {
    method: "DELETE",
    path: "/api/integrations/toggl/connect",
    handler: ({ user }, service) => service.deleteTogglConnection(user.id),
  },
];
