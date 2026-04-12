import type { DragEndEvent } from "@dnd-kit/core";
import type { ScheduleBlock, Task } from "@timefraim/shared";
import { startTransition } from "react";
import type { PlannerScheduleBlockUpdateInput } from "@/features/planner/types";

export type SelectedTaskSource = "queue" | "timeline";

export function filterQueueTasks(tasks: Task[], search: string) {
  const needle = search.trim().toLowerCase();
  return tasks.filter((task) => {
    if (task.scheduledBlockId !== null || task.status === "done" || task.status === "archived") {
      return false;
    }

    return !needle || [task.title, task.notes ?? ""].join(" ").toLowerCase().includes(needle);
  });
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

export async function handlePlannerDragEnd(args: {
  event: DragEndEvent;
  onCreateScheduleBlock: (values: { taskId: string; startAt: string; endAt: string; source: "manual" }) => Promise<unknown>;
  onUpdateScheduleBlock: (scheduleBlockId: string, values: PlannerScheduleBlockUpdateInput) => Promise<unknown>;
  onQueueTaskSelected: (taskId: string) => void;
  onQueueTaskReset: (taskId: string) => void;
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

  try {
    await args.onUpdateScheduleBlock(draggedBlock.id, { startAt: slotIso, endAt });
  } catch (error) {
    args.onError("Failed to move the scheduled task. Please try again.", error);
  }
}
