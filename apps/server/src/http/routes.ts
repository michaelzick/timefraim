import type { ApiRoute } from "./api-routes.ts";
import { authRoutes } from "./auth-routes.ts";
import { integrationRoutes } from "./integration-routes.ts";
import { plannerRoutes } from "./planner-routes.ts";
import { preferencesRoutes } from "./preferences-routes.ts";

export const apiRoutes: ApiRoute[] = [
  ...authRoutes,
  ...integrationRoutes,
  ...preferencesRoutes,
  ...plannerRoutes,
];
