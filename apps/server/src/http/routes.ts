import {
  authSessionSchema,
  dayQuerySchema,
  googleConnectSchema,
  scheduleBlockCreateSchema,
  scheduleBlockUpdateSchema,
  taskInputSchema,
  taskUpdateSchema,
  timerStartSchema,
  timerStopSchema,
  togglConnectSchema,
} from "@timefraim/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireAuthenticatedUser } from "./auth.js";
import { PlannerService } from "../services/planner-service.js";
import { todayIsoDate } from "../utils/date.js";

const draftIdSchema = z.object({ draftId: z.string().uuid() });

async function resolveUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    return await requireAuthenticatedUser(request.headers.authorization);
  } catch (error) {
    reply.status(401).send({ message: (error as Error).message });
    return null;
  }
}

export async function registerHttpRoutes(app: FastifyInstance, plannerService: PlannerService) {
  app.get("/health", async () => ({ ok: true }));

  app.get("/api/auth/me", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    return authSessionSchema.parse({
      user,
      integrationStatus: await plannerService.getIntegrationStatus(),
    });
  });

  app.get("/api/integrations/status", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    return plannerService.getIntegrationStatus();
  });

  app.post("/api/integrations/google/session", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const payload = googleConnectSchema.parse(request.body);
    if (payload.email.toLowerCase() !== user.email.toLowerCase()) {
      reply.status(403).send({ message: "Google session must belong to the signed-in account" });
      return;
    }

    return plannerService.saveGoogleSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken ?? null,
      expiresAt: payload.expiresAt ?? null,
      email: payload.email,
      calendarId: payload.calendarId,
    });
  });

  app.post("/api/integrations/toggl/connect", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const payload = togglConnectSchema.parse(request.body);
    return plannerService.saveTogglConnection({
      apiToken: payload.apiToken,
      workspaceId: payload.workspaceId,
      defaultProjectId: payload.defaultProjectId ?? null,
    });
  });

  app.get("/api/day-plan", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const query = dayQuerySchema.safeParse(request.query);
    const date = query.success ? query.data.date : todayIsoDate();
    return plannerService.getDayPlan(date);
  });

  app.post("/api/calendar/sync", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const query = dayQuerySchema.safeParse(request.query);
    const date = query.success ? query.data.date : todayIsoDate();
    return {
      date,
      events: await plannerService.syncGoogleCalendar(date),
    };
  });

  app.get("/api/tasks", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const snapshot = await plannerService.getDayPlan(todayIsoDate());
    return snapshot.tasks;
  });

  app.post("/api/tasks", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const payload = taskInputSchema.parse(request.body);
    return plannerService.createAndApplyDraft("task.create", payload, "user");
  });

  app.patch("/api/tasks/:taskId", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ taskId: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        title: z.string().min(1).max(200).optional(),
        notes: z.string().max(5000).nullable().optional(),
        estimatedMinutes: z.number().int().positive().max(720).optional(),
        status: z.enum(["inbox", "planned", "scheduled", "in_progress", "done", "archived"]).optional(),
        togglProjectId: z.string().nullable().optional(),
      })
      .parse(request.body);

    return plannerService.createAndApplyDraft(
      "task.update",
      taskUpdateSchema.parse({
        taskId: params.taskId,
        ...body,
      }),
      "user",
    );
  });

  app.post("/api/schedule-blocks", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const payload = scheduleBlockCreateSchema.parse(request.body);
    return plannerService.createAndApplyDraft("schedule_block.create", payload, "user");
  });

  app.patch("/api/schedule-blocks/:scheduleBlockId", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ scheduleBlockId: z.string().uuid() }).parse(request.params);
    const payload = z
      .object({
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
        source: z.enum(["manual", "ai", "sync"]).optional(),
      })
      .parse(request.body);
    return plannerService.createAndApplyDraft(
      "schedule_block.update",
      scheduleBlockUpdateSchema.parse({
        scheduleBlockId: params.scheduleBlockId,
        ...payload,
      }),
      "user",
    );
  });

  app.delete("/api/schedule-blocks/:scheduleBlockId", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const params = z.object({ scheduleBlockId: z.string().uuid() }).parse(request.params);
    return plannerService.createAndApplyDraft(
      "schedule_block.delete",
      { scheduleBlockId: params.scheduleBlockId },
      "user",
    );
  });

  app.get("/api/drafts", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    return (await plannerService.getDayPlan(todayIsoDate())).drafts;
  });

  app.post("/api/drafts/:draftId/confirm", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const params = draftIdSchema.parse(request.params);
    return plannerService.confirmDraft(params.draftId, "user");
  });

  app.post("/api/drafts/:draftId/reject", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const params = draftIdSchema.parse(request.params);
    return plannerService.rejectDraft(params.draftId, "user");
  });

  app.post("/api/timers/start", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const payload = timerStartSchema.parse(request.body);
    return plannerService.createAndApplyDraft("timer.start", payload, "user");
  });

  app.post("/api/timers/stop", async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) {
      return;
    }

    const payload = timerStopSchema.parse(request.body ?? {});
    return plannerService.createAndApplyDraft("timer.stop", payload, "user");
  });
}
