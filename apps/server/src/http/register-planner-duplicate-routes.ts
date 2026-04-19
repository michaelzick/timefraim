import {
  scheduleBlockDuplicatePayloadSchema,
  taskDuplicatePayloadSchema,
} from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import {
  scheduleBlockIdParamsSchema,
  taskIdParamsSchema,
} from "./planner-route-schemas.js";
import { parseWithReply, withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerPlannerDuplicateRoutes(
  app: FastifyInstance,
  plannerService: PlannerService,
) {
  app.post(
    "/api/tasks/:taskId/duplicate",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(reply, taskIdParamsSchema, request.params);
      const body = parseWithReply(
        reply,
        taskDuplicatePayloadSchema.omit({ sourceTaskId: true }),
        request.body ?? {},
      );
      if (!params || !body) {
        return null;
      }
      const outcome = await plannerService.duplicateTask(
        { sourceTaskId: params.taskId, ...body },
        "user",
        user.id,
      );
      return { status: "applied" as const, ...outcome };
    }),
  );

  app.post(
    "/api/schedule-blocks/:scheduleBlockId/duplicate",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(reply, scheduleBlockIdParamsSchema, request.params);
      const body = parseWithReply(
        reply,
        scheduleBlockDuplicatePayloadSchema.omit({ sourceBlockId: true }),
        request.body,
      );
      if (!params || !body) {
        return null;
      }
      const outcome = await plannerService.duplicateScheduleBlock(
        { sourceBlockId: params.scheduleBlockId, ...body },
        "user",
        user.id,
      );
      return { status: "applied" as const, ...outcome };
    }),
  );
}
