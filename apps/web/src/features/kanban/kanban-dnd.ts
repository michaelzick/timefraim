import type { Task } from "@timefraim/shared";
import { KANBAN_STATUSES, type KanbanStatus } from "@/features/kanban/kanban-types";
import { KANBAN_COLUMNS } from "@/features/kanban/kanban-utils";

export function readKanbanTask(data: unknown): Task | null {
  if (!data || typeof data !== "object" || !("dragType" in data) || data.dragType !== "kanban-task") {
    return null;
  }
  return "task" in data ? (data.task as Task) : null;
}

export function readKanbanStatus(data: unknown): KanbanStatus | null {
  if (!data || typeof data !== "object" || !("kanbanStatus" in data)) {
    return null;
  }
  const value = data.kanbanStatus;
  return KANBAN_STATUSES.includes(value as KanbanStatus) ? (value as KanbanStatus) : null;
}

export function getColumnTitle(status: KanbanStatus) {
  return KANBAN_COLUMNS.find((column) => column.status === status)?.title ?? "Board";
}

export function getKanbanMoveToast(status: KanbanStatus) {
  if (status === "done") {
    return "Marked as done";
  }
  if (status === "scheduled") {
    return "Scheduled on the timeline";
  }
  if (status === "planned") {
    return "Moved to Planned";
  }
  return `Moved to ${getColumnTitle(status)}`;
}
