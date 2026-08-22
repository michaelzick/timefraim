import type { SyncDraft } from "@timefraim/shared";
import {
  applyCalendarEventDismissDraft,
  applyCalendarEventUpdateDraft,
} from "./planner-calendar-changes.ts";
import {
  applyScheduleBlockDuplicateDraft,
  applyTaskDuplicateDraft,
} from "./planner-duplicate-changes.ts";
import {
  applyScheduleBlockCreateDraft,
  applyScheduleBlockDeleteDraft,
  applyScheduleBlockUpdateDraft,
} from "./planner-schedule-changes.ts";
import {
  applyTaskCreateDraft,
  applyTaskDeleteDraft,
  applyTaskUpdateDraft,
} from "./planner-task-changes.ts";
import { applyTimerStartDraft, applyTimerStartEventDraft, applyTimerStopDraft } from "./planner-timer-changes.ts";
import type { DraftHandlerContext } from "./planner-service-types.ts";

export async function applyDraftChange(context: DraftHandlerContext): Promise<SyncDraft | null> {
  switch (context.draft.kind) {
    case "task.create":
      return applyTaskCreateDraft(context);
    case "task.update":
      return applyTaskUpdateDraft(context);
    case "task.delete":
      return applyTaskDeleteDraft(context);
    case "task.duplicate":
      return applyTaskDuplicateDraft(context);
    case "schedule_block.create":
      return applyScheduleBlockCreateDraft(context);
    case "schedule_block.update":
      return applyScheduleBlockUpdateDraft(context);
    case "schedule_block.delete":
      return applyScheduleBlockDeleteDraft(context);
    case "schedule_block.duplicate":
      return applyScheduleBlockDuplicateDraft(context);
    case "calendar_event.dismiss":
      return applyCalendarEventDismissDraft(context);
    case "calendar_event.update":
      return applyCalendarEventUpdateDraft(context);
    case "timer.start":
      return applyTimerStartDraft(context);
    case "timer.start_event":
      return applyTimerStartEventDraft(context);
    case "timer.stop":
      return applyTimerStopDraft(context);
  }
}
