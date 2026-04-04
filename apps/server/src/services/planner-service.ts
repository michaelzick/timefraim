import {
  dayPlanSchema,
  formatDraftSummary,
  type ActorRole,
  type DraftKind,
  type ScheduleBlockCreate,
  type ScheduleBlockUpdate,
  type TaskInput,
  type TaskUpdate,
} from "@schejewel/shared";
import { env } from "../config/env.js";
import { pool, withTransaction } from "../db/pool.js";
import {
  deleteGoogleScheduleBlock,
  syncGoogleCalendarWindow,
  toCalendarEventView,
  upsertGoogleScheduleBlock,
  type GoogleConnection,
} from "../integration/google-calendar.js";
import { startTogglTimer, stopTogglTimer, type TogglConnection } from "../integration/toggl-track.js";
import { PlannerRepository } from "../repositories/planner-repository.js";
import { detectScheduleConflicts, finalizeTimerSession, resolveIdleTaskStatus } from "./planner-domain.js";
import { endOfDay, startOfDay, todayIsoDate } from "../utils/date.js";

type SideEffect =
  | { type: "google.upsert"; taskId: string; scheduleBlockId: string }
  | { type: "google.delete"; googleEventId: string | null; scheduleBlockId: string }
  | { type: "toggl.start"; taskId: string; timerSessionId: string; source: "manual" | "ai" | "sync" }
  | { type: "toggl.stop"; togglEntryId: string | null | undefined };

export class PlannerService {
  constructor(private readonly repository = new PlannerRepository()) {}

  async getIntegrationStatus() {
    const rows = await this.repository.listIntegrationTokens(pool);
    return this.repository.getIntegrationStatus(rows, {
      mcpFullAccessConfigured: Boolean(env.MCP_BEARER_TOKEN),
      mcpReadOnlyConfigured: Boolean(env.MCP_READ_ONLY_TOKEN),
      tunnelBaseUrl: env.TUNNEL_PUBLIC_BASE_URL || null,
    });
  }

  async getGoogleConnection(): Promise<GoogleConnection | null> {
    const row = await this.repository.getIntegrationToken("google", pool);
    if (!row?.access_token) {
      return null;
    }

    return {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      calendarId:
        typeof row.metadata?.calendarId === "string" ? row.metadata.calendarId : env.GOOGLE_CALENDAR_ID,
      email: typeof row.metadata?.email === "string" ? row.metadata.email : env.ALLOWED_EMAIL,
    };
  }

  async getTogglConnection(): Promise<TogglConnection | null> {
    const row = await this.repository.getIntegrationToken("toggl", pool);
    if (!row?.access_token) {
      return null;
    }

    return {
      apiToken: row.access_token,
      workspaceId:
        typeof row.metadata?.workspaceId === "string"
          ? row.metadata.workspaceId
          : env.TOGGL_WORKSPACE_ID || "",
      defaultProjectId:
        typeof row.metadata?.defaultProjectId === "string" ? row.metadata.defaultProjectId : null,
    };
  }

  async saveGoogleSession(input: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    email: string;
    calendarId: string;
  }) {
    await this.repository.upsertIntegrationToken(
      "google",
      {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        metadata: {
          email: input.email,
          calendarId: input.calendarId,
        },
      },
      pool,
    );
    return this.getIntegrationStatus();
  }

  async saveTogglConnection(input: {
    apiToken: string;
    workspaceId: string;
    defaultProjectId: string | null;
  }) {
    await this.repository.upsertIntegrationToken(
      "toggl",
      {
        accessToken: input.apiToken,
        refreshToken: null,
        expiresAt: null,
        metadata: {
          workspaceId: input.workspaceId,
          defaultProjectId: input.defaultProjectId,
        },
      },
      pool,
    );
    return this.getIntegrationStatus();
  }

  async getDayPlan(date = todayIsoDate()) {
    const range = {
      startAt: startOfDay(date).toISOString(),
      endAt: endOfDay(date).toISOString(),
    };

    const [tasks, scheduleBlocks, calendarEvents, drafts, auditLogs, activeTimer, integrationStatus] =
      await Promise.all([
        this.repository.listTasks(pool),
        this.repository.listScheduleBlocksForRange(range, pool),
        this.repository.listCalendarEventsForRange(range, pool),
        this.repository.listDrafts("pending", pool),
        this.repository.listRecentAuditLogs(pool),
        this.repository.getActiveTimer(pool),
        this.getIntegrationStatus(),
      ]);

    return dayPlanSchema.parse({
      date,
      tasks,
      scheduleBlocks,
      calendarEvents,
      drafts,
      auditLogs,
      activeTimer,
      integrationStatus,
    });
  }

  async syncGoogleCalendar(date = todayIsoDate()) {
    const connection = await this.getGoogleConnection();
    const range = {
      timeMin: startOfDay(date).toISOString(),
      timeMax: endOfDay(date).toISOString(),
    };

    const records = await syncGoogleCalendarWindow(connection, range);

    for (const record of records) {
      await this.repository.upsertCalendarEvent(
        {
          externalEventId: record.externalEventId,
          title: record.title,
          startAt: record.startAt,
          endAt: record.endAt,
          isAppManaged: record.isAppManaged,
          scheduleBlockId: record.scheduleBlockId,
          rawPayload: record.rawPayload,
        },
        pool,
      );
    }

    return records.map(toCalendarEventView);
  }

  async createDraft(kind: DraftKind, payload: Record<string, unknown>, actorRole: ActorRole) {
    return this.repository.createDraft(
      {
        kind,
        payload,
        actorRole,
        diffSummary: formatDraftSummary(kind, payload),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
      pool,
    );
  }

  async createAndApplyDraft(kind: DraftKind, payload: Record<string, unknown>, actorRole: ActorRole) {
    const draft = await this.createDraft(kind, payload, actorRole);
    return this.confirmDraft(draft.id, actorRole);
  }

  async rejectDraft(draftId: string, actorRole: ActorRole) {
    const draft = await this.repository.updateDraftStatus(draftId, "rejected", pool);
    await this.repository.createAuditLog(
      {
        actorRole,
        action: "draft.rejected",
        entityType: "sync_draft",
        entityId: draft.id,
        diffSummary: draft.diffSummary,
        payload: draft.payload,
      },
      pool,
    );
    return draft;
  }

  async confirmDraft(draftId: string, actorRole: ActorRole) {
    const googleConnection = await this.getGoogleConnection();
    const togglConnection = await this.getTogglConnection();
    const sideEffects: SideEffect[] = [];

    const draft = await withTransaction(async (client) => {
      const draft = await this.repository.getDraft(draftId, client);
      if (!draft) {
        throw new Error(`Draft ${draftId} not found`);
      }
      if (draft.status !== "pending") {
        return draft;
      }

      switch (draft.kind) {
        case "task.create": {
          const payload = draft.payload as unknown as TaskInput;
          const task = await this.repository.createTask(
            {
              title: payload.title,
              notes: payload.notes ?? null,
              estimatedMinutes: payload.estimatedMinutes ?? 30,
              status: payload.status ?? "inbox",
              togglProjectId: payload.togglProjectId ?? null,
            },
            client,
          );
          await this.repository.createAuditLog(
            {
              actorRole,
              action: draft.kind,
              entityType: "task",
              entityId: task.id,
              diffSummary: draft.diffSummary,
              payload: draft.payload,
            },
            client,
          );
          return this.repository.updateDraftStatus(draftId, "applied", client);
        }

        case "task.update": {
          const payload = draft.payload as unknown as TaskUpdate;
          const task = await this.repository.updateTask(
            payload.taskId,
            {
              title: payload.title,
              notes: payload.notes,
              estimatedMinutes: payload.estimatedMinutes,
              status: payload.status,
              togglProjectId: payload.togglProjectId,
            },
            client,
          );
          await this.repository.createAuditLog(
            {
              actorRole,
              action: draft.kind,
              entityType: "task",
              entityId: task.id,
              diffSummary: draft.diffSummary,
              payload: draft.payload,
            },
            client,
          );
          return this.repository.updateDraftStatus(draftId, "applied", client);
        }

        case "schedule_block.create": {
          const payload = draft.payload as unknown as ScheduleBlockCreate;
          const task = await this.repository.getTask(payload.taskId, client);
          if (!task) {
            throw new Error(`Task ${payload.taskId} not found`);
          }
          const range = {
            startAt: startOfDay(payload.startAt.slice(0, 10)).toISOString(),
            endAt: endOfDay(payload.startAt.slice(0, 10)).toISOString(),
          };
          const [blocks, events] = await Promise.all([
            this.repository.listScheduleBlocksForRange(range, client),
            this.repository.listCalendarEventsForRange(range, client),
          ]);
          const conflicts = detectScheduleConflicts({
            candidateStartAt: payload.startAt,
            candidateEndAt: payload.endAt,
            scheduleBlocks: blocks,
            calendarEvents: events,
          });
          if (conflicts.length > 0) {
            throw new Error(`Schedule conflict with ${conflicts[0].title}`);
          }
          const block = await this.repository.createScheduleBlock(
            {
              taskId: payload.taskId,
              startAt: payload.startAt,
              endAt: payload.endAt,
              source: payload.source,
              state: googleConnection ? "sync_pending" : "confirmed",
            },
            client,
          );
          await this.repository.updateTask(
            task.id,
            {
              scheduledBlockId: block.id,
              status: "scheduled",
            },
            client,
          );
          await this.repository.createAuditLog(
            {
              actorRole,
              action: draft.kind,
              entityType: "schedule_block",
              entityId: block.id,
              diffSummary: draft.diffSummary,
              payload: draft.payload,
            },
            client,
          );
          sideEffects.push({ type: "google.upsert", taskId: task.id, scheduleBlockId: block.id });
          return this.repository.updateDraftStatus(draftId, "applied", client);
        }

        case "schedule_block.update": {
          const payload = draft.payload as unknown as ScheduleBlockUpdate;
          const existingBlock = await this.repository.getScheduleBlock(payload.scheduleBlockId, client);
          if (!existingBlock) {
            throw new Error(`Schedule block ${payload.scheduleBlockId} not found`);
          }

          const nextStartAt = payload.startAt ?? existingBlock.startAt;
          const nextEndAt = payload.endAt ?? existingBlock.endAt;
          const range = {
            startAt: startOfDay(nextStartAt.slice(0, 10)).toISOString(),
            endAt: endOfDay(nextStartAt.slice(0, 10)).toISOString(),
          };
          const [blocks, events] = await Promise.all([
            this.repository.listScheduleBlocksForRange(range, client),
            this.repository.listCalendarEventsForRange(range, client),
          ]);
          const conflicts = detectScheduleConflicts({
            candidateStartAt: nextStartAt,
            candidateEndAt: nextEndAt,
            scheduleBlocks: blocks,
            calendarEvents: events,
            ignoreScheduleBlockId: existingBlock.id,
          });
          if (conflicts.length > 0) {
            throw new Error(`Schedule conflict with ${conflicts[0].title}`);
          }
          const block = await this.repository.updateScheduleBlock(
            existingBlock.id,
            {
              startAt: payload.startAt,
              endAt: payload.endAt,
              source: payload.source,
              state: googleConnection ? "sync_pending" : "confirmed",
            },
            client,
          );
          await this.repository.createAuditLog(
            {
              actorRole,
              action: draft.kind,
              entityType: "schedule_block",
              entityId: block.id,
              diffSummary: draft.diffSummary,
              payload: draft.payload,
            },
            client,
          );
          sideEffects.push({ type: "google.upsert", taskId: block.taskId, scheduleBlockId: block.id });
          return this.repository.updateDraftStatus(draftId, "applied", client);
        }

        case "schedule_block.delete": {
          const payload = draft.payload as { scheduleBlockId: string };
          const existingBlock = await this.repository.getScheduleBlock(payload.scheduleBlockId, client);
          if (!existingBlock) {
            throw new Error(`Schedule block ${payload.scheduleBlockId} not found`);
          }
          const task = await this.repository.getTask(existingBlock.taskId, client);
          await this.repository.deleteCalendarEventByScheduleBlockId(existingBlock.id, client);
          await this.repository.deleteScheduleBlock(existingBlock.id, client);
          if (task?.scheduledBlockId === existingBlock.id) {
            await this.repository.updateTask(
              task.id,
              {
                scheduledBlockId: null,
                status: task.status === "done" ? "done" : "planned",
              },
              client,
            );
          }
          await this.repository.createAuditLog(
            {
              actorRole,
              action: draft.kind,
              entityType: "schedule_block",
              entityId: existingBlock.id,
              diffSummary: draft.diffSummary,
              payload: draft.payload,
            },
            client,
          );
          sideEffects.push({
            type: "google.delete",
            googleEventId: existingBlock.googleEventId,
            scheduleBlockId: existingBlock.id,
          });
          return this.repository.updateDraftStatus(draftId, "applied", client);
        }

        case "timer.start": {
          const payload = draft.payload as { taskId: string; source: "manual" | "ai" | "sync" };
          const task = await this.repository.getTask(payload.taskId, client);
          if (!task) {
            throw new Error(`Task ${payload.taskId} not found`);
          }
          const active = await this.repository.getActiveTimer(client);
          if (active) {
            const previousTask = await this.repository.getTask(active.taskId, client);
            const stopped = finalizeTimerSession(active, new Date().toISOString());
            await this.repository.stopTimer(active.id, stopped.endedAt!, stopped.durationSeconds!, client);
            if (previousTask) {
              await this.repository.updateTask(
                previousTask.id,
                { status: resolveIdleTaskStatus(previousTask) },
                client,
              );
            }
            sideEffects.push({ type: "toggl.stop", togglEntryId: active.togglEntryId });
          }

          const timer = await this.repository.createTimerSession(
            {
              taskId: task.id,
              startedAt: new Date().toISOString(),
              source: payload.source,
            },
            client,
          );
          await this.repository.updateTask(task.id, { status: "in_progress" }, client);
          await this.repository.createAuditLog(
            {
              actorRole,
              action: draft.kind,
              entityType: "timer_session",
              entityId: timer.id,
              diffSummary: draft.diffSummary,
              payload: draft.payload,
            },
            client,
          );
          sideEffects.push({ type: "toggl.start", taskId: task.id, timerSessionId: timer.id, source: payload.source });
          return this.repository.updateDraftStatus(draftId, "applied", client);
        }

        case "timer.stop": {
          const active = await this.repository.getActiveTimer(client);
          if (active) {
            const task = await this.repository.getTask(active.taskId, client);
            const stopped = finalizeTimerSession(active, new Date().toISOString());
            await this.repository.stopTimer(active.id, stopped.endedAt!, stopped.durationSeconds!, client);
            if (task) {
              await this.repository.updateTask(task.id, { status: resolveIdleTaskStatus(task) }, client);
            }
            sideEffects.push({ type: "toggl.stop", togglEntryId: active.togglEntryId });
            await this.repository.createAuditLog(
              {
                actorRole,
                action: draft.kind,
                entityType: "timer_session",
                entityId: active.id,
                diffSummary: draft.diffSummary,
                payload: draft.payload,
              },
              client,
            );
          }
          return this.repository.updateDraftStatus(draftId, "applied", client);
        }
      }
    });

    await this.runSideEffects(sideEffects, googleConnection, togglConnection);
    return draft;
  }

  private async runSideEffects(
    sideEffects: SideEffect[],
    googleConnection: GoogleConnection | null,
    togglConnection: TogglConnection | null,
  ) {
    for (const effect of sideEffects) {
      if (effect.type === "google.upsert") {
        const [task, block] = await Promise.all([
          this.repository.getTask(effect.taskId, pool),
          this.repository.getScheduleBlock(effect.scheduleBlockId, pool),
        ]);
        if (!task || !block) {
          continue;
        }

        try {
          const googleEventId = await upsertGoogleScheduleBlock({
            connection: googleConnection,
            task,
            block,
          });
          await this.repository.updateScheduleBlock(
            block.id,
            {
              googleEventId,
              state: googleEventId ? "synced" : "confirmed",
            },
            pool,
          );
          await this.repository.upsertCalendarEvent(
            {
              externalEventId: googleEventId ?? `local-${block.id}`,
              title: task.title,
              startAt: block.startAt,
              endAt: block.endAt,
              isAppManaged: true,
              scheduleBlockId: block.id,
              rawPayload: {
                source: "schejewel",
                pendingSync: !googleEventId,
              },
            },
            pool,
          );
        } catch (error) {
          await this.repository.updateScheduleBlock(block.id, { state: "failed" }, pool);
          console.error("Google schedule upsert failed", error);
        }
      }

      if (effect.type === "google.delete") {
        try {
          await deleteGoogleScheduleBlock(googleConnection, effect.googleEventId);
        } catch (error) {
          console.error("Google schedule delete failed", error);
        }
      }

      if (effect.type === "toggl.start") {
        const task = await this.repository.getTask(effect.taskId, pool);
        if (!task) {
          continue;
        }
        try {
          const result = await startTogglTimer({
            connection: togglConnection,
            task,
            source: effect.source,
          });
          if (result.togglEntryId) {
            await this.repository.attachTogglEntry(effect.timerSessionId, result.togglEntryId, pool);
          }
        } catch (error) {
          console.error("Toggl start failed", error);
        }
      }

      if (effect.type === "toggl.stop") {
        try {
          await stopTogglTimer(togglConnection, effect.togglEntryId);
        } catch (error) {
          console.error("Toggl stop failed", error);
        }
      }
    }
  }
}
