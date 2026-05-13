import type { ScheduleBlockState } from "@timefraim/shared";
import {
  resolvePlannerSyncTarget,
  type DraftHandlerContext,
} from "./planner-service-types.js";

type ScheduleSyncContext = Pick<
  DraftHandlerContext,
  "googlePlannerSyncTarget" | "sideEffects" | "syncPlannerBlocksToCalendar"
>;

export function resolveScheduleBlockSyncState(context: ScheduleSyncContext): ScheduleBlockState {
  return resolvePlannerSyncTarget(context) === "none" ? "confirmed" : "sync_pending";
}

export function queueScheduleBlockSync(
  context: ScheduleSyncContext,
  taskId: string,
  scheduleBlockId: string,
) {
  const target = resolvePlannerSyncTarget(context);
  if (target === "none") {
    return;
  }

  context.sideEffects.push({
    type: "google.upsert",
    taskId,
    scheduleBlockId,
    target,
  });
}
