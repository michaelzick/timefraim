import type { FastifyInstance } from "fastify";
import { parseWithReply, withAuthenticatedRoute } from "./route-helpers.js";
import { draftIdSchema } from "./planner-route-schemas.js";
import type { PlannerService } from "../services/planner-service.js";
import { todayIsoDate } from "../utils/date.js";

export function registerPlannerDraftRoutes(
  app: FastifyInstance,
  plannerService: PlannerService,
) {
  app.get(
    "/api/drafts",
    withAuthenticatedRoute(async (_request, _reply, user) => {
      return (await plannerService.getDayPlan(user.id, todayIsoDate())).drafts;
    }),
  );

  app.post(
    "/api/drafts/:draftId/confirm",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(reply, draftIdSchema, request.params);
      if (!params) {
        return null;
      }
      return plannerService.confirmDraft(params.draftId, "user", user.id);
    }),
  );

  app.post(
    "/api/drafts/:draftId/reject",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(reply, draftIdSchema, request.params);
      if (!params) {
        return null;
      }
      return plannerService.rejectDraft(params.draftId, "user", user.id);
    }),
  );
}
