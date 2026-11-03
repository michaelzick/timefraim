import type { ScheduleBlock, Task } from "@timefraim/shared";
import { toast } from "sonner";
import { showActionError } from "@/features/planner/planner-page-utils";
import type { PlannerScheduleBlockUpdateInput } from "@/features/planner/types";
import { formatPlannerDateFromIso, getTimezoneOffsetForDate } from "@/lib/utils";

type ScheduleBlockRange = Pick<ScheduleBlock, "id" | "startAt" | "endAt">;

export function formatLocalTimeInput(isoString: string) {
  const value = new Date(isoString);
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export function formatMoveDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

/**
 * Rebuilds the start from local date and time parts so 9:00 AM stays 9:00 AM across
 * a daylight saving change. plannerDate must be the target day: the server uses it
 * as the Google Tasks due date in preference to the block's own start.
 */
export function buildScheduleBlockMove(args: {
  startAt: string;
  endAt: string;
  targetDate: string;
  startTime?: string;
}) {
  const startTime = args.startTime ?? formatLocalTimeInput(args.startAt);
  const nextStart = new Date(`${args.targetDate}T${startTime}:00`);
  const durationMs = new Date(args.endAt).getTime() - new Date(args.startAt).getTime();

  return {
    startAt: nextStart.toISOString(),
    endAt: new Date(nextStart.getTime() + durationMs).toISOString(),
    plannerDate: args.targetDate,
    tzOffsetMinutes: getTimezoneOffsetForDate(args.targetDate),
  };
}

/**
 * Tasks carry their scheduled times for every day, so a clash can be named here. The
 * server's message for a block only has its id, and it remains the final check for
 * anything this list can't see, such as Google events.
 */
export function findScheduleBlockMoveConflict(
  tasks: Task[],
  move: { startAt: string; endAt: string },
  scheduleBlockId: string,
) {
  const startMs = new Date(move.startAt).getTime();
  const endMs = new Date(move.endAt).getTime();

  return tasks.find((task) => {
    if (!task.scheduledBlockId || task.scheduledBlockId === scheduleBlockId) return false;
    if (!task.scheduledStartAt || !task.scheduledEndAt) return false;
    return startMs < new Date(task.scheduledEndAt).getTime() && new Date(task.scheduledStartAt).getTime() < endMs;
  }) ?? null;
}

export async function runScheduleBlockMove(args: {
  block: ScheduleBlockRange;
  targetDate: string;
  startTime?: string;
  tasks: Task[];
  onUpdateScheduleBlock: (scheduleBlockId: string, values: PlannerScheduleBlockUpdateInput) => Promise<unknown>;
  onViewDay?: (date: string) => void;
}): Promise<"moved" | "unchanged"> {
  const { block, targetDate, onUpdateScheduleBlock, onViewDay } = args;
  const currentTime = formatLocalTimeInput(block.startAt);
  const startTime = args.startTime ?? currentTime;
  const originalDate = formatPlannerDateFromIso(block.startAt) ?? targetDate;
  if (originalDate === targetDate && currentTime === startTime) {
    return "unchanged";
  }

  const move = buildScheduleBlockMove({ startAt: block.startAt, endAt: block.endAt, targetDate, startTime });
  const conflict = findScheduleBlockMoveConflict(args.tasks, move, block.id);
  if (conflict) {
    // Same wording as the server, so getActionErrorMessage explains it the same way.
    throw new Error(`Schedule conflict with ${conflict.title}`);
  }

  await onUpdateScheduleBlock(block.id, move);

  const undo = {
    label: "Undo",
    onClick: () => {
      void onUpdateScheduleBlock(block.id, {
        startAt: block.startAt,
        endAt: block.endAt,
        plannerDate: originalDate,
        tzOffsetMinutes: getTimezoneOffsetForDate(originalDate),
      }).catch((error) => showActionError("Failed to undo the move. Please try again.", error));
    },
  };
  const message = `Moved to ${formatMoveDate(targetDate)}`;
  if (onViewDay) {
    toast.success(message, {
      duration: 8000,
      action: { label: "View day", onClick: () => onViewDay(targetDate) },
      cancel: undo,
    });
  } else {
    toast.success(message, { duration: 8000, action: undo });
  }
  return "moved";
}
