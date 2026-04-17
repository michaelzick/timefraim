import {
  timerStartEventSchema,
  timerStartSchema,
  timerStopSchema,
} from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import { parseWithReply, withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerPlannerTimerRoutes(
  app: FastifyInstance,
  plannerService: PlannerService,
) {
  app.post(
    "/api/timers/start",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, timerStartSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.applyChange("timer.start", payload, "user", user.id);
    }),
  );

  app.post(
    "/api/timers/start-event",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, timerStartEventSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.applyChange(
        "timer.start_event",
        payload,
        "user",
        user.id,
      );
    }),
  );

  app.post(
    "/api/timers/stop",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, timerStopSchema, request.body ?? {});
      if (!payload) {
        return null;
      }
      return plannerService.applyChange("timer.stop", payload, "user", user.id);
    }),
  );
}
