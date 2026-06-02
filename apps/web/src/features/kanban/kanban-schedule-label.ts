import type { ScheduleBlock, Task } from "@timefraim/shared";

type ScheduledRange = {
  startAt: string;
  endAt: string;
};

export function getTaskScheduleLabel(task: Task, scheduleBlocks: ScheduleBlock[]) {
  if (!task.scheduledBlockId) {
    return "Unscheduled";
  }

  const range = getTaskScheduledRange(task, scheduleBlocks);
  if (!range) {
    return "Scheduled date unavailable";
  }

  return `${formatDate(range.startAt)}, ${formatTime(range.startAt)}-${formatTime(range.endAt)}`;
}

function getTaskScheduledRange(task: Task, scheduleBlocks: ScheduleBlock[]): ScheduledRange | null {
  if (task.scheduledStartAt && task.scheduledEndAt) {
    return { startAt: task.scheduledStartAt, endAt: task.scheduledEndAt };
  }

  const block = scheduleBlocks.find((candidate) => candidate.id === task.scheduledBlockId);
  return block ? { startAt: block.startAt, endAt: block.endAt } : null;
}

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(isoString));
}

function formatTime(isoString: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString));
}
