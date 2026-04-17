import type { Task } from "@timefraim/shared";
import {
  resolvePlannerTaskStatus,
  showActionError,
  type LocalPlannerTaskInput,
  type LocalPlannerTaskUpdateInput,
  type PlannerCreateTaskValues,
  type PlannerSaveTaskValues,
} from "@/features/planner/planner-page-utils";
import type { CalendarEventFormValues, PlannerCalendarEventUpdateInput } from "@/features/planner/types";

export function buildCalendarEventUpdateInput(values: CalendarEventFormValues): PlannerCalendarEventUpdateInput {
  return {
    togglProjectId: values.togglProjectId || null,
  };
}

export function buildPlannerCreateTaskInput(values: PlannerCreateTaskValues, date: string): LocalPlannerTaskInput {
  return {
    title: values.title,
    notes: values.notes || undefined,
    estimatedMinutes: Number(values.estimatedMinutes),
    priority: values.priority,
    status: "planned",
    togglProjectId: values.togglProjectId || null,
    plannerDate: date,
  };
}

export function buildPlannerTaskUpdateInput(
  selectedTask: Task,
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

export function confirmSelectedTaskDelete(selectedTask: Task | null) {
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

export function createPlannerMutationHandlers(args: {
  selectedTask: Task | null;
  onDeleteTask: (taskId: string) => Promise<unknown>;
  onDeleteScheduleBlock: (scheduleBlockId: string) => Promise<unknown>;
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
  };
}
