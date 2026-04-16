import type { SyncDraft } from "@timefraim/shared";
import { applyCalendarEventDismissDraft } from "./planner-calendar-changes.js";
import {
  applyScheduleBlockCreateDraft,
  applyScheduleBlockDeleteDraft,
  applyScheduleBlockUpdateDraft,
} from "./planner-schedule-changes.js";
import {
  applyTaskCreateDraft,
  applyTaskDeleteDraft,
  applyTaskUpdateDraft,
} from "./planner-task-changes.js";
import { applyTimerStartDraft, applyTimerStartEventDraft, applyTimerStopDraft } from "./planner-timer-changes.js";
import type { DraftHandlerContext } from "./planner-service-types.js";

export async function applyDraftChange(context: DraftHandlerContext): Promise<SyncDraft | null> {
  switch (context.draft.kind) {
    case "task.create":
      return applyTaskCreateDraft(context);
    case "task.update":
      return applyTaskUpdateDraft(context);
    case "task.delete":
      return applyTaskDeleteDraft(context);
    case "schedule_block.create":
      return applyScheduleBlockCreateDraft(context);
    case "schedule_block.update":
      return applyScheduleBlockUpdateDraft(context);
    case "schedule_block.delete":
      return applyScheduleBlockDeleteDraft(context);
    case "calendar_event.dismiss":
      return applyCalendarEventDismissDraft(context);
    case "timer.start":
      return applyTimerStartDraft(context);
    case "timer.start_event":
      return applyTimerStartEventDraft(context);
    case "timer.stop":
      return applyTimerStopDraft(context);
  }
}
