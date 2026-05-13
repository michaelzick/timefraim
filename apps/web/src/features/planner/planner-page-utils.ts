import { toast } from "sonner";
import type { Task } from "@timefraim/shared";
import { getTaskLifecycleValue } from "@/features/planner/task-presentation";
import { ApiRequestError } from "@/lib/api-client";
import type {
  CreateTaskValues,
  PlannerScheduleBlockUpdateInput,
  PlannerTaskInput,
  PlannerTaskUpdateInput,
  TaskFormValues,
} from "@/features/planner/types";

export type PlannerPriority = "low" | "medium" | "high" | "urgent";
export type PlannerStatus = "inbox" | "planned" | "scheduled" | "in_progress" | "done";
export type PlannerCreateTaskValues = {
  title: string;
  notes: string;
  estimatedMinutes: number;
  priority: PlannerPriority;
  togglProjectId: string;
};
export type LocalPlannerTaskInput = {
  title: string;
  notes?: string;
  estimatedMinutes: number;
  priority: PlannerPriority;
  status: PlannerStatus;
  togglProjectId?: string | null;
  plannerDate?: string;
  tzOffsetMinutes?: number;
};
export type LocalPlannerTaskUpdateInput = {
  title: string;
  notes: string;
  estimatedMinutes: number;
  priority: PlannerPriority;
  status: PlannerStatus;
  togglProjectId?: string | null;
  completedOnDate?: string | null;
  plannerDate?: string;
  tzOffsetMinutes?: number;
};
export type LocalPlannerScheduleBlockUpdateInput = {
  startAt: string;
  endAt: string;
  plannerDate?: string;
  tzOffsetMinutes?: number;
};
export type PlannerSaveTaskValues = {
  title: string;
  notes: string;
  estimatedMinutes: number;
  priority: PlannerPriority;
  lifecycle: "active" | "done";
  togglProjectId: string;
};

export const EMPTY_CREATE_TASK_VALUES: CreateTaskValues = {
  title: "",
  notes: "",
  estimatedMinutes: 30,
  priority: "low",
  togglProjectId: "",
};

const EMPTY_TASK_FORM_VALUES: TaskFormValues = {
  title: "",
  notes: "",
  estimatedMinutes: 30,
  priority: "low",
  lifecycle: "active",
  togglProjectId: "",
};

export type CreateTaskInput = PlannerTaskInput;
export type UpdateTaskInput = PlannerTaskUpdateInput;
export type UpdateScheduleBlockInput = PlannerScheduleBlockUpdateInput;

export function getTaskFormValues(selectedTask: Task | null): TaskFormValues {
  if (!selectedTask) {
    return EMPTY_TASK_FORM_VALUES;
  }

  return {
    title: selectedTask.title,
    notes: selectedTask.notes ?? "",
    estimatedMinutes: selectedTask.estimatedMinutes,
    priority: selectedTask.priority,
    lifecycle: getTaskLifecycleValue(selectedTask),
    togglProjectId: selectedTask.togglProjectId ?? "",
  };
}

export function resolvePlannerTaskStatus(task: Pick<Task, "id" | "scheduledBlockId">, lifecycle: PlannerSaveTaskValues["lifecycle"], activeTimerTaskId: string | null): PlannerStatus {
  if (lifecycle !== "active") {
    return lifecycle;
  }

  if (activeTimerTaskId === task.id) {
    return "in_progress";
  }

  return task.scheduledBlockId ? "scheduled" : "planned";
}

function getActionErrorMessage(message: string, error: unknown) {
  if (error instanceof ApiRequestError && error.code === "dependency_unavailable") {
    return error.message;
  }

  if (error instanceof Error && error.message.startsWith("Schedule conflict with ")) {
    const conflictingTitle = error.message.slice("Schedule conflict with ".length).trim();
    return `Tasks can't overlap on the timeline. This change would overlap with "${conflictingTitle}". Shorten or move this task, or clear the conflicting event first.`;
  }

  return message;
}

export function showActionError(message: string, error: unknown) {
  const displayMessage = getActionErrorMessage(message, error);
  console.error(displayMessage, error);
  toast.error(displayMessage, { duration: 8000 });
}
