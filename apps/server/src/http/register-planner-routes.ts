import type { FastifyInstance } from "fastify";
import { registerPlannerDraftRoutes } from "./register-planner-draft-routes.js";
import { registerPlannerMutationRoutes } from "./register-planner-mutation-routes.js";
import { registerPlannerTimerRoutes } from "./register-planner-timer-routes.js";
import { parseDayQuery, withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerPlannerRoutes(app: FastifyInstance, plannerService: PlannerService) {
  app.get(
    "/api/day-plan",
    withAuthenticatedRoute(async (request, _reply, user) => {
      const { date, tz } = parseDayQuery(request.query);
      return plannerService.getDayPlan(user.id, date, tz);
    }),
  );

  app.post(
    "/api/calendar/sync",
    withAuthenticatedRoute(async (request) => {
      const { date, tz } = parseDayQuery(request.query);
      return { date, events: await plannerService.syncGoogleCalendar(date, tz) };
    }),
  );
  registerPlannerMutationRoutes(app, plannerService);
  registerPlannerDraftRoutes(app, plannerService);
  registerPlannerTimerRoutes(app, plannerService);
}
