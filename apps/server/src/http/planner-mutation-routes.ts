import {
  calendarEventUpdateSchema,
  scheduleBlockCreateSchema,
  scheduleBlockUpdateSchema,
  taskInputSchema,
  taskUpdateSchema,
} from "@timefraim/shared";
import { parseOrThrow, type ApiRoute } from "./api-routes.ts";
import {
  calendarEventIdParamsSchema,
  scheduleBlockIdParamsSchema,
  taskIdParamsSchema,
} from "./planner-route-schemas.ts";

export const plannerMutationRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/tasks",
    handler: async ({ user }, service) => (await service.getDayPlan(user.id)).tasks,
  },
  {
    method: "POST",
    path: "/api/tasks",
    handler: ({ user, body }, service) =>
      service.applyChange("task.create", parseOrThrow(taskInputSchema, body), "user", user.id),
  },
  {
    method: "PATCH",
    path: "/api/tasks/:taskId",
    handler: ({ user, params, body }, service) => {
      const { taskId } = parseOrThrow(taskIdParamsSchema, params);
      const payload = parseOrThrow(taskUpdateSchema.omit({ taskId: true }), body);
      return service.applyChange("task.update", { taskId, ...payload }, "user", user.id);
    },
  },
  {
    method: "DELETE",
    path: "/api/tasks/:taskId",
    handler: ({ user, params }, service) => {
      const { taskId } = parseOrThrow(taskIdParamsSchema, params);
      return service.applyChange("task.delete", { taskId }, "user", user.id);
    },
  },
  {
    method: "POST",
    path: "/api/schedule-blocks",
    handler: ({ user, body }, service) =>
      service.applyChange(
        "schedule_block.create",
        parseOrThrow(scheduleBlockCreateSchema, body),
        "user",
        user.id,
      ),
  },
  {
    method: "PATCH",
    path: "/api/schedule-blocks/:scheduleBlockId",
    handler: ({ user, params, body }, service) => {
      const { scheduleBlockId } = parseOrThrow(scheduleBlockIdParamsSchema, params);
      const payload = parseOrThrow(scheduleBlockUpdateSchema.omit({ scheduleBlockId: true }), body);
      return service.applyChange(
        "schedule_block.update",
        { scheduleBlockId, ...payload },
        "user",
        user.id,
      );
    },
  },
  {
    method: "DELETE",
    path: "/api/schedule-blocks/:scheduleBlockId",
    handler: ({ user, params }, service) => {
      const { scheduleBlockId } = parseOrThrow(scheduleBlockIdParamsSchema, params);
      return service.applyChange("schedule_block.delete", { scheduleBlockId }, "user", user.id);
    },
  },
  {
    method: "POST",
    path: "/api/calendar-events/:calendarEventId/dismiss",
    handler: ({ user, params }, service) => {
      const { calendarEventId } = parseOrThrow(calendarEventIdParamsSchema, params);
      return service.applyChange("calendar_event.dismiss", { calendarEventId }, "user", user.id);
    },
  },
  {
    method: "PATCH",
    path: "/api/calendar-events/:calendarEventId",
    handler: ({ user, params, body }, service) => {
      const { calendarEventId } = parseOrThrow(calendarEventIdParamsSchema, params);
      const payload = parseOrThrow(calendarEventUpdateSchema, body);
      return service.applyChange(
        "calendar_event.update",
        { calendarEventId, togglProjectId: payload.togglProjectId ?? null },
        "user",
        user.id,
      );
    },
  },
];
