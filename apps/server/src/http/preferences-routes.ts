import { userPreferencesUpdateSchema } from "@timefraim/shared";
import { parseOrThrow, type ApiRoute } from "./api-routes.ts";

export const preferencesRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/preferences",
    handler: ({ user }, service) => service.getUserPreferences(user.id),
  },
  {
    method: "PUT",
    path: "/api/preferences",
    handler: ({ user, body }, service) =>
      service.saveUserPreferences(user.id, parseOrThrow(userPreferencesUpdateSchema, body)),
  },
];
