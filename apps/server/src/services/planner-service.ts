import { dayPlanSchema, formatDraftSummary, type ActorRole, type DraftKind } from "@timefraim/shared";
import { env } from "../config/env.js";
import { pool, withTransaction } from "../db/pool.js";
import { syncGoogleCalendarWindow } from "../integration/google-calendar.js";
import { PlannerRepository } from "../repositories/planner-repository.js";
import { endOfDay, startOfDay, todayIsoDate } from "../utils/date.js";
import { applyDraftChange } from "./planner-draft-application.js";
import { getGoogleConnection, getTogglConnection, saveGoogleSession, saveTogglConnection } from "./planner-service-integrations.js";
import { runPlannerSideEffects } from "./planner-side-effects.js";
import type { DraftToApply, SideEffect } from "./planner-service-types.js";
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
  async saveGoogleSession(input: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    email: string;
    calendarId: string;
  }) {
    await saveGoogleSession(this.repository, input);
    return this.getIntegrationStatus();
  }
  async saveTogglConnection(input: { apiToken: string; workspaceId: string; defaultProjectId: string | null }) {
    await saveTogglConnection(this.repository, input);
    return this.getIntegrationStatus();
  }
  async getDayPlan(date = todayIsoDate(), tzOffsetMinutes = 0) {
    const range = {
      startAt: startOfDay(date, tzOffsetMinutes).toISOString(),
      endAt: endOfDay(date, tzOffsetMinutes).toISOString(),
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
  async syncGoogleCalendar(date = todayIsoDate(), tzOffsetMinutes = 0) {
    const connection = await getGoogleConnection(this.repository);
    const range = {
      timeMin: startOfDay(date, tzOffsetMinutes).toISOString(),
      timeMax: endOfDay(date, tzOffsetMinutes).toISOString(),
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
          externalUpdatedAt: record.externalUpdatedAt,
          dismissedExternalUpdatedAt: null,
        },
        pool,
      );
    }

    return this.repository.listCalendarEventsForRange({ startAt: range.timeMin, endAt: range.timeMax }, pool);
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
  async applyChange(kind: DraftKind, payload: Record<string, unknown>, actorRole: ActorRole) {
    const googleConnection = await getGoogleConnection(this.repository);
    const togglConnection = await getTogglConnection(this.repository);
    const sideEffects: SideEffect[] = [];
    const diffSummary = formatDraftSummary(kind, payload);

    await withTransaction((client) =>
      this.applyDraft(
        { id: null, kind, payload, diffSummary, status: "pending" },
        actorRole,
        client,
        sideEffects,
        Boolean(googleConnection),
        false,
      ),
    );

    await runPlannerSideEffects(this.repository, sideEffects, googleConnection, togglConnection);
    return { status: "applied" as const, kind, diffSummary };
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
    const googleConnection = await getGoogleConnection(this.repository);
    const togglConnection = await getTogglConnection(this.repository);
    const sideEffects: SideEffect[] = [];
    const draft = await withTransaction(async (client) => {
      const existingDraft = await this.repository.getDraft(draftId, client);
      if (!existingDraft) {
        throw new Error(`Draft ${draftId} not found`);
      }
      if (existingDraft.status !== "pending") {
        return existingDraft;
      }

      return this.applyDraft(existingDraft, actorRole, client, sideEffects, Boolean(googleConnection), true);
    });

    await runPlannerSideEffects(this.repository, sideEffects, googleConnection, togglConnection);
    return draft;
  }
  private async applyDraft(
    draft: DraftToApply,
    actorRole: ActorRole,
    client: Parameters<typeof applyDraftChange>[0]["client"],
    sideEffects: SideEffect[],
    googleConnected: boolean,
    persistDraftStatus: boolean,
  ) {
    const markApplied = () =>
      persistDraftStatus && draft.id ? this.repository.updateDraftStatus(draft.id, "applied", client) : Promise.resolve(null);

    return applyDraftChange({
      actorRole,
      client,
      draft,
      googleConnected,
      markApplied,
      repository: this.repository,
      sideEffects,
    });
  }
}
