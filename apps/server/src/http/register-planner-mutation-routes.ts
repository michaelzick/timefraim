import {
  calendarEventUpdateSchema,
  scheduleBlockCreateSchema,
  scheduleBlockUpdateSchema,
  taskInputSchema,
  taskUpdateSchema,
} from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import {
  calendarEventIdParamsSchema,
  scheduleBlockIdParamsSchema,
  taskIdParamsSchema,
} from "./planner-route-schemas.js";
import { parseWithReply, withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";

export function registerPlannerMutationRoutes(
  app: FastifyInstance,
  plannerService: PlannerService,
) {
  app.get(
    "/api/tasks",
    withAuthenticatedRoute(async (_request, _reply, user) => {
      const snapshot = await plannerService.getDayPlan(user.id);
      return snapshot.tasks;
    }),
  );

  app.post(
    "/api/tasks",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, taskInputSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.applyChange("task.create", payload, "user", user.id);
    }),
  );

  app.patch(
    "/api/tasks/:taskId",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(reply, taskIdParamsSchema, request.params);
      const body = parseWithReply(
        reply,
        taskUpdateSchema.omit({ taskId: true }),
        request.body,
      );
      if (!params || !body) {
        return null;
      }
      return plannerService.applyChange(
        "task.update",
        { taskId: params.taskId, ...body },
        "user",
        user.id,
      );
    }),
  );

  app.delete(
    "/api/tasks/:taskId",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(reply, taskIdParamsSchema, request.params);
      if (!params) {
        return null;
      }
      return plannerService.applyChange(
        "task.delete",
        { taskId: params.taskId },
        "user",
        user.id,
      );
    }),
  );

  app.post(
    "/api/schedule-blocks",
    withAuthenticatedRoute(async (request, reply, user) => {
      const payload = parseWithReply(reply, scheduleBlockCreateSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.applyChange(
        "schedule_block.create",
        payload,
        "user",
        user.id,
      );
    }),
  );

  app.patch(
    "/api/schedule-blocks/:scheduleBlockId",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(
        reply,
        scheduleBlockIdParamsSchema,
        request.params,
      );
      const payload = parseWithReply(
        reply,
        scheduleBlockUpdateSchema.omit({ scheduleBlockId: true }),
        request.body,
      );
      if (!params || !payload) {
        return null;
      }
      return plannerService.applyChange(
        "schedule_block.update",
        { scheduleBlockId: params.scheduleBlockId, ...payload },
        "user",
        user.id,
      );
    }),
  );

  app.delete(
    "/api/schedule-blocks/:scheduleBlockId",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(
        reply,
        scheduleBlockIdParamsSchema,
        request.params,
      );
      if (!params) {
        return null;
      }
      return plannerService.applyChange(
        "schedule_block.delete",
        { scheduleBlockId: params.scheduleBlockId },
        "user",
        user.id,
      );
    }),
  );

  app.post(
    "/api/calendar-events/:calendarEventId/dismiss",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(
        reply,
        calendarEventIdParamsSchema,
        request.params,
      );
      if (!params) {
        return null;
      }
      return plannerService.applyChange(
        "calendar_event.dismiss",
        { calendarEventId: params.calendarEventId },
        "user",
        user.id,
      );
    }),
  );

  app.patch(
    "/api/calendar-events/:calendarEventId",
    withAuthenticatedRoute(async (request, reply, user) => {
      const params = parseWithReply(
        reply,
        calendarEventIdParamsSchema,
        request.params,
      );
      const body = parseWithReply(reply, calendarEventUpdateSchema, request.body);
      if (!params || !body) {
        return null;
      }
      return plannerService.applyChange(
        "calendar_event.update",
        { calendarEventId: params.calendarEventId, togglProjectId: body.togglProjectId ?? null },
        "user",
        user.id,
      );
    }),
  );
}
