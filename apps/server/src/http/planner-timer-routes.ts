import {
  timerStartEventSchema,
  timerStartSchema,
  timerStopSchema,
} from "@timefraim/shared";
import { parseOrThrow, type ApiRoute } from "./api-routes.ts";

export const plannerTimerRoutes: ApiRoute[] = [
  {
    method: "POST",
    path: "/api/timers/start",
    handler: ({ user, body }, service) =>
      service.applyChange("timer.start", parseOrThrow(timerStartSchema, body), "user", user.id),
  },
  {
    method: "POST",
    path: "/api/timers/start-event",
    handler: ({ user, body }, service) =>
      service.applyChange(
        "timer.start_event",
        parseOrThrow(timerStartEventSchema, body),
        "user",
        user.id,
      ),
  },
  {
    method: "POST",
    path: "/api/timers/stop",
    handler: ({ user, body }, service) =>
      service.applyChange("timer.stop", parseOrThrow(timerStopSchema, body ?? {}), "user", user.id),
  },
];
