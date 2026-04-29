import {
  formatDraftSummary,
  type ActorRole,
  type ScheduleBlockDuplicatePayload,
  type TaskDuplicatePayload,
} from "@timefraim/shared";
import { withTransaction } from "../db/pool.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import {
  duplicateScheduleBlockInContext,
  duplicateTaskInContext,
  type DuplicateOutcome,
} from "./planner-duplicate-changes.js";
import {
  getAllowedPlannerUserId,
  getGoogleCalendarSyncState,
  getTogglConnection,
} from "./planner-service-integrations.js";
import { runPlannerSideEffects } from "./planner-side-effects.js";
import type { SideEffect } from "./planner-service-types.js";

type DuplicateContext = {
  repository: PlannerRepository;
  actorRole: ActorRole;
  userId: string | null | undefined;
};

export async function duplicateTaskForUser(
  context: DuplicateContext,
  payload: TaskDuplicatePayload,
): Promise<DuplicateOutcome & { kind: "task.duplicate"; diffSummary: string }> {
  const effectiveUserId = await resolveUserId(context);
  const googleSyncState = await getGoogleCalendarSyncState(context.repository);
  const googleConnection = googleSyncState.connection;
  const togglConnection = await getTogglConnection(context.repository, effectiveUserId);
  const sideEffects: SideEffect[] = [];
  const diffSummary = formatDraftSummary("task.duplicate", payload);

  const outcome = await withTransaction((client) =>
    duplicateTaskInContext({
      repository: context.repository,
      draft: {
        id: null,
        ownerUserId: effectiveUserId,
        kind: "task.duplicate",
        payload: payload as unknown as Record<string, unknown>,
        diffSummary,
        status: "pending",
      },
      actorRole: context.actorRole,
      client,
      sideEffects,
      googleConnected: Boolean(googleConnection),
      syncPlannerBlocksToCalendar: googleSyncState.syncPlannerBlocksToCalendar,
      markApplied: () => Promise.resolve(null),
    }),
  );

  await runPlannerSideEffects(context.repository, sideEffects, googleConnection, togglConnection);
  return { ...outcome, kind: "task.duplicate", diffSummary };
}

export async function duplicateScheduleBlockForUser(
  context: DuplicateContext,
  payload: ScheduleBlockDuplicatePayload,
): Promise<DuplicateOutcome & { kind: "schedule_block.duplicate"; diffSummary: string }> {
  const effectiveUserId = await resolveUserId(context);
  const googleSyncState = await getGoogleCalendarSyncState(context.repository);
  const googleConnection = googleSyncState.connection;
  const togglConnection = await getTogglConnection(context.repository, effectiveUserId);
  const sideEffects: SideEffect[] = [];
  const diffSummary = formatDraftSummary("schedule_block.duplicate", payload);

  const outcome = await withTransaction((client) =>
    duplicateScheduleBlockInContext({
      repository: context.repository,
      draft: {
        id: null,
        ownerUserId: effectiveUserId,
        kind: "schedule_block.duplicate",
        payload: payload as unknown as Record<string, unknown>,
        diffSummary,
        status: "pending",
      },
      actorRole: context.actorRole,
      client,
      sideEffects,
      googleConnected: Boolean(googleConnection),
      syncPlannerBlocksToCalendar: googleSyncState.syncPlannerBlocksToCalendar,
      markApplied: () => Promise.resolve(null),
    }),
  );

  await runPlannerSideEffects(context.repository, sideEffects, googleConnection, togglConnection);
  return { ...outcome, kind: "schedule_block.duplicate", diffSummary };
}

async function resolveUserId(context: DuplicateContext) {
  return (
    context.userId
    ?? (context.actorRole === "assistant" ? await getAllowedPlannerUserId(context.repository) : null)
  );
}
