import { parseOrThrow, type ApiRoute } from "./api-routes.ts";
import { draftIdSchema } from "./planner-route-schemas.ts";
import { todayIsoDate } from "../utils/date.ts";

export const plannerDraftRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/drafts",
    handler: async ({ user }, service) => (await service.getDayPlan(user.id, todayIsoDate())).drafts,
  },
  {
    method: "POST",
    path: "/api/drafts/:draftId/confirm",
    handler: ({ user, params }, service) =>
      service.confirmDraft(parseOrThrow(draftIdSchema, params).draftId, "user", user.id),
  },
  {
    method: "POST",
    path: "/api/drafts/:draftId/reject",
    handler: ({ user, params }, service) =>
      service.rejectDraft(parseOrThrow(draftIdSchema, params).draftId, "user", user.id),
  },
];
