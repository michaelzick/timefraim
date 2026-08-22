import {
  scheduleBlockDuplicatePayloadSchema,
  taskDuplicatePayloadSchema,
} from "@timefraim/shared";
import { parseOrThrow, type ApiRoute } from "./api-routes.ts";
import {
  scheduleBlockIdParamsSchema,
  taskIdParamsSchema,
} from "./planner-route-schemas.ts";

export const plannerDuplicateRoutes: ApiRoute[] = [
  {
    method: "POST",
    path: "/api/tasks/:taskId/duplicate",
    handler: async ({ user, params, body }, service) => {
      const { taskId } = parseOrThrow(taskIdParamsSchema, params);
      const payload = parseOrThrow(taskDuplicatePayloadSchema.omit({ sourceTaskId: true }), body ?? {});
      const outcome = await service.duplicateTask({ sourceTaskId: taskId, ...payload }, "user", user.id);
      return { status: "applied" as const, ...outcome };
    },
  },
  {
    method: "POST",
    path: "/api/schedule-blocks/:scheduleBlockId/duplicate",
    handler: async ({ user, params, body }, service) => {
      const { scheduleBlockId } = parseOrThrow(scheduleBlockIdParamsSchema, params);
      const payload = parseOrThrow(
        scheduleBlockDuplicatePayloadSchema.omit({ sourceBlockId: true }),
        body,
      );
      const outcome = await service.duplicateScheduleBlock(
        { sourceBlockId: scheduleBlockId, ...payload },
        "user",
        user.id,
      );
      return { status: "applied" as const, ...outcome };
    },
  },
];
