import type { ScheduleBlock, Task } from "@timefraim/shared";
import { KANBAN_STATUSES, type KanbanStatus } from "@/features/kanban/kanban-types";

export type KanbanSortMode = "priority" | "date-asc" | "date-desc";

export const KANBAN_SORT_OPTIONS: { mode: KanbanSortMode; label: string }[] = [
  { mode: "priority", label: "Priority" },
  { mode: "date-asc", label: "Date (oldest first)" },
  { mode: "date-desc", label: "Date (newest first)" },
];

export const DEFAULT_COLUMN_SORT_MODES: Record<KanbanStatus, KanbanSortMode> = {
  inbox: "priority",
  planned: "priority",
  scheduled: "priority",
  done: "priority",
};

const PRIORITY_RANK: Record<Task["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function compareKanbanTasks(left: Task, right: Task) {
  const priorityDelta = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

// The card's visible date: its scheduled start, then the schedule block's start, then creation time.
// The createdAt fallback guarantees every task resolves to a date, so date sorts have no null edge case.
export function getKanbanSortDate(task: Task, scheduleBlocks: ScheduleBlock[]): string {
  return (
    task.scheduledStartAt
    ?? scheduleBlocks.find((block) => block.id === task.scheduledBlockId)?.startAt
    ?? task.createdAt
  );
}

function compareByDate(left: Task, right: Task, scheduleBlocks: ScheduleBlock[], direction: 1 | -1) {
  const delta =
    new Date(getKanbanSortDate(left, scheduleBlocks)).getTime()
    - new Date(getKanbanSortDate(right, scheduleBlocks)).getTime();
  if (delta !== 0) {
    return delta * direction;
  }
  return compareKanbanTasks(left, right);
}

export function sortColumnTasks(
  tasks: Task[],
  mode: KanbanSortMode,
  scheduleBlocks: ScheduleBlock[],
): Task[] {
  const sorted = [...tasks];
  if (mode === "priority") {
    return sorted.sort(compareKanbanTasks);
  }
  const direction = mode === "date-asc" ? 1 : -1;
  return sorted.sort((left, right) => compareByDate(left, right, scheduleBlocks, direction));
}

export function sortGroupedColumns(
  grouped: Record<KanbanStatus, Task[]>,
  modes: Record<KanbanStatus, KanbanSortMode>,
  scheduleBlocks: ScheduleBlock[],
): Record<KanbanStatus, Task[]> {
  const result = {} as Record<KanbanStatus, Task[]>;
  for (const status of KANBAN_STATUSES) {
    result[status] = sortColumnTasks(grouped[status], modes[status], scheduleBlocks);
  }
  return result;
}
