import type { DragEndEvent } from "@dnd-kit/core";
import type { CalendarEventView, PlannerDuplicateResult, ScheduleBlock, Task } from "@timefraim/shared";
import { startTransition } from "react";
import type { PlannerScheduleBlockUpdateInput } from "@/features/planner/types";

export type SelectedTaskSource = "queue" | "timeline";

export type TaskCategoryFilter = "all" | Task["category"];

export type PlannerSelection =
  | { type: "queue-task"; taskId: string }
  | { type: "timeline-task"; taskId: string }
  | { type: "calendar-event"; calendarEventId: string }
  | { type: "none" };

export function filterQueueTasks(tasks: Task[], search: string, categoryFilter: TaskCategoryFilter = "all") {
  const needle = search.trim().toLowerCase();
  return tasks.filter((task) => {
    if (task.scheduledBlockId !== null || task.status === "done") {
      return false;
    }

    if (categoryFilter !== "all" && task.category !== categoryFilter) {
      return false;
    }

    return !needle || [task.title, task.notes ?? ""].join(" ").toLowerCase().includes(needle);
  });
}

export function filterTasksByCategory(tasks: Task[], categoryFilter: TaskCategoryFilter) {
  if (categoryFilter === "all") {
    return tasks;
  }
  return tasks.filter((task) => task.category === categoryFilter);
}

export function selectDoneTasks(tasks: Task[], date: string) {
  return tasks
    .filter((task) => task.status === "done" && task.completedOnDate === date)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function resolveTaskSelection(args: {
  tasks: Task[];
  queueTasks: Task[];
  selectedTaskId: string | null;
  selectedTaskSource: SelectedTaskSource;
}) {
  const selectedTask = args.selectedTaskId ? args.tasks.find((task) => task.id === args.selectedTaskId) ?? null : null;

  if (args.selectedTaskSource === "timeline" && selectedTask) {
    return { selectedTask, selectedTaskId: selectedTask.id, selectedTaskSource: args.selectedTaskSource };
  }

  if (selectedTask && args.queueTasks.some((task) => task.id === selectedTask.id)) {
    return { selectedTask, selectedTaskId: selectedTask.id, selectedTaskSource: "queue" as const };
  }

  const fallbackTask = args.queueTasks[0] ?? null;
  return { selectedTask: fallbackTask, selectedTaskId: fallbackTask?.id ?? null, selectedTaskSource: "queue" as const };
}

export function getSelectedCalendarEventId(selection: PlannerSelection): string | null {
  if (selection.type === "calendar-event") {
    return selection.calendarEventId;
  }
  return null;
}

export function resolveSelectedCalendarEvent(
  selection: PlannerSelection,
  calendarEvents: CalendarEventView[],
): CalendarEventView | null {
  if (selection.type !== "calendar-event") {
    return null;
  }
  return calendarEvents.find((e) => e.id === selection.calendarEventId) ?? null;
}

export async function handlePlannerDragEnd(args: {
  event: DragEndEvent;
  isAltPressed: boolean;
  onCreateScheduleBlock: (values: { taskId: string; startAt: string; endAt: string; source: "manual" }) => Promise<unknown>;
  onUpdateScheduleBlock: (scheduleBlockId: string, values: PlannerScheduleBlockUpdateInput) => Promise<unknown>;
  onDuplicateTask: (
    taskId: string,
    body?: { startAt?: string; endAt?: string; plannerDate?: string },
  ) => Promise<PlannerDuplicateResult>;
  onDuplicateScheduleBlock: (
    scheduleBlockId: string,
    body: { startAt: string; endAt: string },
  ) => Promise<PlannerDuplicateResult>;
  onQueueTaskSelected: (taskId: string) => void;
  onQueueTaskReset: (taskId: string) => void;
  onDuplicated: (kind: "task" | "schedule-block", id: string) => void;
  onError: (message: string, error: unknown) => void;
}) {
  const slotIso = args.event.over?.data.current?.slotIso as string | undefined;
  const dragType = args.event.active.data.current?.dragType as "queue-task" | "schedule-block" | undefined;

  if (!slotIso || !dragType) {
    return;
  }

  if (dragType === "queue-task") {
    const draggedTask = args.event.active.data.current?.task as Task | undefined;
    if (!draggedTask) {
      return;
    }

    const endAt = new Date(new Date(slotIso).getTime() + draggedTask.estimatedMinutes * 60000).toISOString();

    if (args.isAltPressed) {
      try {
        const result = await args.onDuplicateTask(draggedTask.id, { startAt: slotIso, endAt });
        if (result.createdTaskId) {
          args.onDuplicated("task", result.createdTaskId);
        }
      } catch (error) {
        args.onError("Failed to duplicate the task. Please try again.", error);
      }
      return;
    }

    try {
      startTransition(() => args.onQueueTaskSelected(draggedTask.id));
      await args.onCreateScheduleBlock({ taskId: draggedTask.id, startAt: slotIso, endAt, source: "manual" });
    } catch (error) {
      startTransition(() => args.onQueueTaskReset(draggedTask.id));
      args.onError("Failed to schedule the task. Please try again.", error);
    }
    return;
  }

  const draggedBlock = args.event.active.data.current?.scheduleBlock as ScheduleBlock | undefined;
  if (!draggedBlock) {
    return;
  }

  const durationMs = new Date(draggedBlock.endAt).getTime() - new Date(draggedBlock.startAt).getTime();
  const endAt = new Date(new Date(slotIso).getTime() + durationMs).toISOString();
  if (slotIso === draggedBlock.startAt && endAt === draggedBlock.endAt) {
    return;
  }

  if (args.isAltPressed) {
    try {
      const result = await args.onDuplicateTask(draggedBlock.taskId, { startAt: slotIso, endAt });
      if (result.createdTaskId) {
        args.onDuplicated("task", result.createdTaskId);
      }
    } catch (error) {
      args.onError("Failed to duplicate the schedule block. Please try again.", error);
    }
    return;
  }

  try {
    await args.onUpdateScheduleBlock(draggedBlock.id, { startAt: slotIso, endAt });
  } catch (error) {
    args.onError("Failed to move the scheduled task. Please try again.", error);
  }
}
