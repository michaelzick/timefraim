import { formatDraftSummary, type ActorRole, type DraftKind, type GoogleCalendarSettingsUpdate, type ScheduleBlockDuplicatePayload, type TaskDuplicatePayload } from "@timefraim/shared";
import { env } from "../config/env.js";
import { pool, withTransaction } from "../db/pool.js";
import { PlannerRepository } from "../repositories/planner-repository.js";
import { todayIsoDate } from "../utils/date.js";
import { applyPlannerDraft } from "./planner-service-apply.js";
import { syncPlannerGoogleCalendar } from "./planner-service-calendar.js";
import { getPlannerDayPlan } from "./planner-service-day-plan.js";
import {
  duplicateScheduleBlockForUser,
  duplicateTaskForUser,
} from "./planner-service-duplicates.js";
import { forbidden, notFound } from "./planner-errors.js";
import {
  deleteTogglConnection,
  discoverTogglConnection,
  getAllowedPlannerUserId,
  getGoogleCalendarSettings,
  getGoogleCalendarSyncState,
  getTogglConnection,
  getTogglSettings,
  saveGoogleCalendarSettings,
  saveGoogleSession,
  saveTogglConnection,
} from "./planner-service-integrations.js";
import { runPlannerSideEffects } from "./planner-side-effects.js";
import type { SideEffect } from "./planner-service-types.js";
export class PlannerService {
  constructor(private readonly repository = new PlannerRepository()) {}
  async getIntegrationStatus(userId?: string | null) {
    const effectiveUserId = userId ?? await getAllowedPlannerUserId(this.repository);
    const rows = await this.repository.listIntegrationTokens(pool);
    const togglConnection = await this.repository.getUserTogglConnection(effectiveUserId, pool);
    return this.repository.getIntegrationStatus(rows, togglConnection, {
      mcpFullAccessConfigured: Boolean(env.MCP_BEARER_TOKEN),
      mcpReadOnlyConfigured: Boolean(env.MCP_READ_ONLY_TOKEN),
      tunnelBaseUrl: env.TUNNEL_PUBLIC_BASE_URL || null,
    });
  }
  async getTogglSettings(userId?: string | null) {
    const effectiveUserId = userId ?? await getAllowedPlannerUserId(this.repository);
    return getTogglSettings(this.repository, effectiveUserId);
  }
  async discoverTogglConnection(input: { apiToken: string; workspaceId?: string | null }) {
    return discoverTogglConnection(input);
  }
  async saveGoogleSession(input: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    email: string;
    calendarId: string;
    userId: string;
  }) {
    await saveGoogleSession(this.repository, input);
    return this.getIntegrationStatus(input.userId);
  }
  async saveTogglConnection(userId: string, input: { apiToken?: string | null; workspaceId: string; defaultProjectId: string | null }) {
    await saveTogglConnection(this.repository, userId, input);
    return this.getTogglSettings(userId);
  }
  async deleteTogglConnection(userId: string) {
    await deleteTogglConnection(this.repository, userId);
    return this.getTogglSettings(userId);
  }
  async getGoogleCalendarSettings() { return getGoogleCalendarSettings(this.repository); }
  async saveGoogleCalendarSettings(input: GoogleCalendarSettingsUpdate) {
    await saveGoogleCalendarSettings(this.repository, input);
    return getGoogleCalendarSettings(this.repository);
  }
  async getDayPlan(userId: string | null = null, date = todayIsoDate(), tzOffsetMinutes = 0) {
    return getPlannerDayPlan({
      repository: this.repository,
      userId,
      date,
      tzOffsetMinutes,
      getIntegrationStatus: (effectiveUserId) => this.getIntegrationStatus(effectiveUserId),
    });
  }
  async syncGoogleCalendar(date = todayIsoDate(), tzOffsetMinutes = 0) { return syncPlannerGoogleCalendar(this.repository, date, tzOffsetMinutes); }
  async createDraft(kind: DraftKind, payload: Record<string, unknown>, actorRole: ActorRole, ownerUserId?: string | null) {
    const resolvedOwnerUserId = ownerUserId ?? (actorRole === "assistant" ? await getAllowedPlannerUserId(this.repository) : null);
    return this.repository.createDraft(
      {
        kind,
        payload,
        actorRole,
        diffSummary: formatDraftSummary(kind, payload),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        ownerUserId: resolvedOwnerUserId,
      },
      pool,
    );
  }
  async createAndApplyDraft(kind: DraftKind, payload: Record<string, unknown>, actorRole: ActorRole, ownerUserId?: string | null) {
    const draft = await this.createDraft(kind, payload, actorRole, ownerUserId);
    return this.confirmDraft(draft.id, actorRole, draft.ownerUserId);
  }
  async duplicateTask(payload: TaskDuplicatePayload, actorRole: ActorRole, userId?: string | null) {
    return duplicateTaskForUser({ repository: this.repository, actorRole, userId }, payload);
  }
  async duplicateScheduleBlock(payload: ScheduleBlockDuplicatePayload, actorRole: ActorRole, userId?: string | null) {
    return duplicateScheduleBlockForUser({ repository: this.repository, actorRole, userId }, payload);
  }
  async applyChange(kind: DraftKind, payload: Record<string, unknown>, actorRole: ActorRole, userId?: string | null) {
    const googleSyncState = await getGoogleCalendarSyncState(this.repository);
    const googleConnection = googleSyncState.connection;
    const effectiveUserId = userId ?? (actorRole === "assistant" ? await getAllowedPlannerUserId(this.repository) : null);
    const togglConnection = await getTogglConnection(this.repository, effectiveUserId);
    const sideEffects: SideEffect[] = [];
    const diffSummary = formatDraftSummary(kind, payload);

    await withTransaction((client) =>
      applyPlannerDraft({
        repository: this.repository,
        draft: { id: null, ownerUserId: effectiveUserId, kind, payload, diffSummary, status: "pending" },
        actorRole,
        client,
        sideEffects,
        googleConnected: Boolean(googleConnection),
        syncPlannerBlocksToCalendar: googleSyncState.syncPlannerBlocksToCalendar,
        persistDraftStatus: false,
      }),
    );

    await runPlannerSideEffects(this.repository, sideEffects, googleConnection, togglConnection);
    return { status: "applied" as const, kind, diffSummary };
  }
  async rejectDraft(draftId: string, actorRole: ActorRole, userId?: string | null) {
    const existingDraft = await this.repository.getDraft(draftId, pool);
    if (!existingDraft) {
      throw notFound(`Draft ${draftId} not found`);
    }
    if (userId && existingDraft.ownerUserId && existingDraft.ownerUserId !== userId) {
      throw forbidden("Draft does not belong to the signed-in user");
    }
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
  async confirmDraft(draftId: string, actorRole: ActorRole, userId?: string | null) {
    const googleSyncState = await getGoogleCalendarSyncState(this.repository);
    const googleConnection = googleSyncState.connection;
    const sideEffects: SideEffect[] = [];
    let togglOwnerUserId = userId ?? null;
    const draft = await withTransaction(async (client) => {
      const existingDraft = await this.repository.getDraft(draftId, client);
      if (!existingDraft) {
        throw notFound(`Draft ${draftId} not found`);
      }
      if (userId && existingDraft.ownerUserId && existingDraft.ownerUserId !== userId) {
        throw forbidden("Draft does not belong to the signed-in user");
      }
      if (existingDraft.status !== "pending") {
        togglOwnerUserId = existingDraft.ownerUserId ?? togglOwnerUserId;
        return existingDraft;
      }

      togglOwnerUserId = existingDraft.ownerUserId ?? togglOwnerUserId ?? (actorRole === "assistant" ? await getAllowedPlannerUserId(this.repository) : null);

      return applyPlannerDraft({
        repository: this.repository,
        draft: existingDraft,
        actorRole,
        client,
        sideEffects,
        googleConnected: Boolean(googleConnection),
        syncPlannerBlocksToCalendar: googleSyncState.syncPlannerBlocksToCalendar,
        persistDraftStatus: true,
      });
    });

    const togglConnection = await getTogglConnection(this.repository, togglOwnerUserId);
    await runPlannerSideEffects(this.repository, sideEffects, googleConnection, togglConnection);
    return draft;
  }
}
