import type { PlannerDuplicateResult } from "@timefraim/shared";
import { toast } from "sonner";
import type { LocalPlannerTaskInput, LocalPlannerTaskUpdateInput, PlannerCreateTaskValues, PlannerSaveTaskValues } from "@/features/planner/planner-page-utils";
import { resolvePlannerTaskStatus, showActionError } from "@/features/planner/planner-page-utils";
import type { CalendarEventFormValues, PlannerCalendarEventUpdateInput } from "@/features/planner/types";

type PlannerPageActionTaskStatus =
  | "inbox"
  | "planned"
  | "scheduled"
  | "in_progress"
  | "done";
type PlannerPageActionTaskPriority = "low" | "medium" | "high" | "urgent";

type PlannerPageActionTask = {
  id: string;
  title: string;
  estimatedMinutes: number;
  priority: PlannerPageActionTaskPriority;
  status: PlannerPageActionTaskStatus;
  notes: string | null;
  togglProjectId?: string | null;
  completedOnDate?: string | null;
  scheduledBlockId?: string | null;
};

export function buildCalendarEventUpdateInput(values: CalendarEventFormValues): PlannerCalendarEventUpdateInput {
  return {
    togglProjectId: values.togglProjectId || null,
  };
}

export function buildPlannerCreateTaskInput(values: PlannerCreateTaskValues, date: string): LocalPlannerTaskInput {
  return {
    title: values.title.trim(),
    notes: values.notes || undefined,
    estimatedMinutes: Number(values.estimatedMinutes),
    priority: values.priority,
    status: "planned",
    togglProjectId: values.togglProjectId || null,
    plannerDate: date,
  };
}

export function buildPlannerTaskUpdateInput(
  selectedTask: PlannerPageActionTask,
  values: PlannerSaveTaskValues,
  activeTimerTaskId: string | null,
): LocalPlannerTaskUpdateInput {
  return {
    title: values.title,
    notes: values.notes,
    estimatedMinutes: values.estimatedMinutes,
    priority: values.priority,
    status: resolvePlannerTaskStatus(selectedTask, values.lifecycle, activeTimerTaskId),
    togglProjectId: values.togglProjectId || null,
  };
}

export function confirmSelectedTaskDelete(selectedTask: PlannerPageActionTask | null) {
  return Boolean(selectedTask && window.confirm(`Delete "${selectedTask.title}" and remove any scheduled block?`));
}

export function confirmQueueTaskDelete(title: string) {
  return window.confirm(`Delete "${title}"?`);
}

export function confirmTimelineEventDismiss(title: string) {
  return window.confirm(`Hide "${title}" from the planner timeline until it changes in Google Calendar?`);
}

export function confirmTimelineBlockDelete(title: string) {
  return window.confirm(`Remove "${title}" from the timeline? The task will return to the queue.`);
}

function taskUpdateInputFor(
  task: PlannerPageActionTask,
  status: PlannerPageActionTaskStatus,
  completedOnDate?: string | null,
): LocalPlannerTaskUpdateInput {
  return {
    title: task.title,
    notes: task.notes ?? "",
    estimatedMinutes: task.estimatedMinutes,
    priority: task.priority,
    status,
    togglProjectId: task.togglProjectId ?? null,
    ...(typeof completedOnDate !== "undefined" ? { completedOnDate } : {}),
  };
}

export function createPlannerMutationHandlers(args: {
  selectedTask: PlannerPageActionTask | null;
  date: string;
  onDeleteTask: (taskId: string) => Promise<unknown>;
  onDeleteScheduleBlock: (scheduleBlockId: string) => Promise<unknown>;
  onUpdateTask: (taskId: string, values: LocalPlannerTaskUpdateInput) => Promise<unknown>;
  onDuplicateTask: (
    taskId: string,
    body?: { startAt?: string; endAt?: string; plannerDate?: string },
  ) => Promise<PlannerDuplicateResult>;
  onStartTimer: (taskId: string) => Promise<unknown>;
}) {
  return {
    async handleDeleteSelectedTask() {
      if (!confirmSelectedTaskDelete(args.selectedTask) || !args.selectedTask) {
        return;
      }

      try {
        await args.onDeleteTask(args.selectedTask.id);
      } catch (error) {
        showActionError("Failed to delete the task. Please try again.", error);
      }
    },
    handleQueueTaskDelete(taskId: string, title: string) {
      if (!confirmQueueTaskDelete(title)) {
        return;
      }

      void args.onDeleteTask(taskId).catch((error) => showActionError("Failed to delete the task. Please try again.", error));
    },
    handleDeleteTimelineBlock(blockId: string, title: string) {
      if (!confirmTimelineBlockDelete(title)) {
        return;
      }

      void args.onDeleteScheduleBlock(blockId).catch((error) => {
        showActionError("Failed to remove the schedule block. Please try again.", error);
      });
    },
    handleReactivateDoneTask(task: PlannerPageActionTask) {
      void args
        .onUpdateTask(task.id, taskUpdateInputFor(task, "planned", null))
        .catch((error) => showActionError("Failed to reactivate the task. Please try again.", error));
    },
    handleDuplicateTask(task: PlannerPageActionTask) {
      void args
        .onDuplicateTask(task.id, { plannerDate: args.date })
        .then((result) => {
          if (!result.createdTaskId) return;
          const createdTaskId = result.createdTaskId;
          toast.success("Duplicated", {
            duration: 8000,
            action: {
              label: "Undo",
              onClick: () => {
                void args.onDeleteTask(createdTaskId);
              },
            },
          });
        })
        .catch((error) => showActionError("Failed to duplicate the task. Please try again.", error));
    },
    handleStartTaskTimer(taskId: string) {
      void args.onStartTimer(taskId).catch((error) => showActionError("Failed to start the timer. Please try again.", error));
    },
    handleMarkTaskDone(task: PlannerPageActionTask) {
      const previousStatus = task.status;
      const previousCompletedOnDate = task.completedOnDate ?? null;
      void args
        .onUpdateTask(task.id, taskUpdateInputFor(task, "done", args.date))
        .then(() => {
          toast.success("Marked done", {
            duration: 8000,
            action: {
              label: "Undo",
              onClick: () => {
                const restoreCompletedOn =
                  previousStatus === "done" ? previousCompletedOnDate : null;
                void args.onUpdateTask(
                  task.id,
                  taskUpdateInputFor(task, previousStatus, restoreCompletedOn),
                );
              },
            },
          });
        })
        .catch((error) => showActionError("Failed to mark the task done. Please try again.", error));
    },
  };
}
