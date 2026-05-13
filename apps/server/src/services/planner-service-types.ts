import type {
  ActorRole,
  DraftKind,
  DraftStatus,
  GooglePlannerSyncTarget,
  SyncDraft,
} from "@timefraim/shared";
import type { Queryable } from "../db/pool.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";

export type SideEffect =
  | {
      type: "google.upsert";
      taskId: string;
      scheduleBlockId: string;
      target: Exclude<GooglePlannerSyncTarget, "none">;
      plannerDate?: string;
      tzOffsetMinutes?: number;
    }
  | { type: "google.delete"; googleEventId: string | null; googleTaskId: string | null; scheduleBlockId: string }
  | { type: "toggl.start"; taskId: string; timerSessionId: string; source: "manual" | "ai" | "sync" }
  | {
      type: "toggl.start_event";
      calendarEventId: string;
      eventTitle: string;
      timerSessionId: string;
      source: "manual" | "ai" | "sync";
      togglProjectId: string | null;
    }
  | { type: "toggl.stop"; togglEntryId: string | null | undefined };

export type DraftToApply = {
  id: string | null;
  ownerUserId: string | null;
  kind: DraftKind;
  payload: Record<string, unknown>;
  diffSummary: string;
  status: DraftStatus;
};

export type DraftHandlerContext = {
  actorRole: ActorRole;
  client: Queryable;
  draft: DraftToApply;
  googleConnected: boolean;
  googlePlannerSyncTarget?: GooglePlannerSyncTarget;
  syncPlannerBlocksToCalendar: boolean;
  markApplied: () => Promise<SyncDraft | null>;
  repository: PlannerRepository;
  sideEffects: SideEffect[];
};

export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export function resolvePlannerSyncTarget(
  context: Pick<DraftHandlerContext, "googlePlannerSyncTarget" | "syncPlannerBlocksToCalendar">,
): GooglePlannerSyncTarget {
  return context.googlePlannerSyncTarget
    ?? (context.syncPlannerBlocksToCalendar ? "calendar_event" : "none");
}
