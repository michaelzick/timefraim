import { authSessionSchema } from "@timefraim/shared";
import type { ApiRoute } from "./api-routes.ts";

const health = { ok: true };

export const authRoutes: ApiRoute[] = [
  { method: "GET", path: "/health", auth: "none", handler: () => health },
  // The edge function only sees paths under /api, so expose health there too.
  { method: "GET", path: "/api/health", auth: "none", handler: () => health },
  {
    method: "GET",
    path: "/api/auth/me",
    handler: async ({ user }, service) =>
      authSessionSchema.parse({
        user,
        integrationStatus: await service.getIntegrationStatus(user.id),
      }),
  },
];
