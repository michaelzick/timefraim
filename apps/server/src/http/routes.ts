import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./register-auth-routes.ts";
import { registerIntegrationRoutes } from "./register-integration-routes.ts";
import { registerPlannerRoutes } from "./register-planner-routes.ts";
import { registerPreferencesRoutes } from "./register-preferences-routes.ts";
import type { PlannerService } from "../services/planner-service.ts";

export function registerHttpRoutes(app: FastifyInstance, plannerService: PlannerService) {
  registerAuthRoutes(app, plannerService);
  registerIntegrationRoutes(app, plannerService);
  registerPreferencesRoutes(app, plannerService);
  registerPlannerRoutes(app, plannerService);
}
