import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./register-auth-routes.js";
import { registerIntegrationRoutes } from "./register-integration-routes.js";
import { registerPlannerRoutes } from "./register-planner-routes.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerHttpRoutes(app: FastifyInstance, plannerService: PlannerService) {
  registerAuthRoutes(app, plannerService);
  registerIntegrationRoutes(app, plannerService);
  registerPlannerRoutes(app, plannerService);
}
