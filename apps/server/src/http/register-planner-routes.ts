import {
  scheduleBlockCreateSchema,
  scheduleBlockUpdateSchema,
  taskInputSchema,
  taskUpdateSchema,
  timerStartSchema,
  timerStopSchema,
} from "@timefraim/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parseDayQuery, parseWithReply, withAuthenticatedRoute } from "./route-helpers.js";
import type { PlannerService } from "../services/planner-service.js";
import { todayIsoDate } from "../utils/date.js";

const draftIdSchema = z.object({ draftId: z.string().uuid() });

export function registerPlannerRoutes(app: FastifyInstance, plannerService: PlannerService) {
  app.get(
    "/api/day-plan",
    withAuthenticatedRoute(async (request) => {
      const { date, tz } = parseDayQuery(request.query);
      return plannerService.getDayPlan(date, tz);
    }),
  );

  app.post(
    "/api/calendar/sync",
    withAuthenticatedRoute(async (request) => {
      const { date, tz } = parseDayQuery(request.query);
      return { date, events: await plannerService.syncGoogleCalendar(date, tz) };
    }),
  );

  app.get(
    "/api/tasks",
    withAuthenticatedRoute(async () => {
      const snapshot = await plannerService.getDayPlan(todayIsoDate());
      return snapshot.tasks;
    }),
  );

  app.post(
    "/api/tasks",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, taskInputSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.applyChange("task.create", payload, "user");
    }),
  );

  app.patch(
    "/api/tasks/:taskId",
    withAuthenticatedRoute(async (request, reply) => {
      const params = parseWithReply(reply, z.object({ taskId: z.string().uuid() }), request.params);
      const body = parseWithReply(reply, taskUpdateSchema.omit({ taskId: true }), request.body);
      if (!params || !body) {
        return null;
      }
      return plannerService.applyChange("task.update", { taskId: params.taskId, ...body }, "user");
    }),
  );

  app.delete(
    "/api/tasks/:taskId",
    withAuthenticatedRoute(async (request, reply) => {
      const params = parseWithReply(reply, z.object({ taskId: z.string().uuid() }), request.params);
      if (!params) {
        return null;
      }
      return plannerService.applyChange("task.delete", { taskId: params.taskId }, "user");
    }),
  );

  app.post(
    "/api/schedule-blocks",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, scheduleBlockCreateSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.applyChange("schedule_block.create", payload, "user");
    }),
  );

  app.patch(
    "/api/schedule-blocks/:scheduleBlockId",
    withAuthenticatedRoute(async (request, reply) => {
      const params = parseWithReply(reply, z.object({ scheduleBlockId: z.string().uuid() }), request.params);
      const payload = parseWithReply(reply, scheduleBlockUpdateSchema.omit({ scheduleBlockId: true }), request.body);
      if (!params || !payload) {
        return null;
      }
      return plannerService.applyChange(
        "schedule_block.update",
        { scheduleBlockId: params.scheduleBlockId, ...payload },
        "user",
      );
    }),
  );

  app.delete(
    "/api/schedule-blocks/:scheduleBlockId",
    withAuthenticatedRoute(async (request, reply) => {
      const params = parseWithReply(reply, z.object({ scheduleBlockId: z.string().uuid() }), request.params);
      if (!params) {
        return null;
      }
      return plannerService.applyChange("schedule_block.delete", { scheduleBlockId: params.scheduleBlockId }, "user");
    }),
  );

  app.post(
    "/api/calendar-events/:calendarEventId/dismiss",
    withAuthenticatedRoute(async (request, reply) => {
      const params = parseWithReply(reply, z.object({ calendarEventId: z.string().uuid() }), request.params);
      if (!params) {
        return null;
      }
      return plannerService.applyChange("calendar_event.dismiss", { calendarEventId: params.calendarEventId }, "user");
    }),
  );

  app.get(
    "/api/drafts",
    withAuthenticatedRoute(async () => (await plannerService.getDayPlan(todayIsoDate())).drafts),
  );

  app.post(
    "/api/drafts/:draftId/confirm",
    withAuthenticatedRoute(async (request, reply) => {
      const params = parseWithReply(reply, draftIdSchema, request.params);
      if (!params) {
        return null;
      }
      return plannerService.confirmDraft(params.draftId, "user");
    }),
  );

  app.post(
    "/api/drafts/:draftId/reject",
    withAuthenticatedRoute(async (request, reply) => {
      const params = parseWithReply(reply, draftIdSchema, request.params);
      if (!params) {
        return null;
      }
      return plannerService.rejectDraft(params.draftId, "user");
    }),
  );

  app.post(
    "/api/timers/start",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, timerStartSchema, request.body);
      if (!payload) {
        return null;
      }
      return plannerService.applyChange("timer.start", payload, "user");
    }),
  );

  app.post(
    "/api/timers/stop",
    withAuthenticatedRoute(async (request, reply) => {
      const payload = parseWithReply(reply, timerStopSchema, request.body ?? {});
      if (!payload) {
        return null;
      }
      return plannerService.applyChange("timer.stop", payload, "user");
    }),
  );
}
