import type { ApiRoute } from "./api-routes.ts";
import { plannerDraftRoutes } from "./planner-draft-routes.ts";
import { plannerDuplicateRoutes } from "./planner-duplicate-routes.ts";
import { plannerMutationRoutes } from "./planner-mutation-routes.ts";
import { plannerTimerRoutes } from "./planner-timer-routes.ts";
import { parseCalendarSyncQuery, parseDayQuery } from "./route-helpers.ts";

export const plannerRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/day-plan",
    handler: ({ user, query }, service) => {
      const { date, tz } = parseDayQuery(query);
      return service.getDayPlan(user.id, date, tz);
    },
  },
  {
    method: "POST",
    path: "/api/calendar/sync",
    handler: ({ query }, service) => {
      const { date, restoreHidden, tz } = parseCalendarSyncQuery(query);
      return service.syncGoogleCalendar(date, tz, { restoreHidden });
    },
  },
  ...plannerMutationRoutes,
  ...plannerDuplicateRoutes,
  ...plannerDraftRoutes,
  ...plannerTimerRoutes,
];
