import type { Task } from "@timefraim/shared";
import type { TaskLifecycleValue } from "@/features/planner/types";

export const PRIORITY_OPTIONS: Task["priority"][] = ["low", "medium", "high", "urgent"];
export const TASK_LIFECYCLE_OPTIONS: TaskLifecycleValue[] = ["active", "done", "archived"];

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const LIFECYCLE_LABELS: Record<TaskLifecycleValue, string> = {
  active: "Active",
  done: "Done",
  archived: "Archived",
};

const PRIORITY_BADGE_CLASSES: Record<Task["priority"], string> = {
  low: "border-[var(--priority-low-border)] bg-[var(--priority-low-soft)] text-[var(--priority-low-text)] normal-case tracking-[0.08em]",
  medium:
    "border-[var(--priority-medium-border)] bg-[var(--priority-medium-soft)] text-[var(--priority-medium-text)] normal-case tracking-[0.08em]",
  high: "border-[var(--priority-high-border)] bg-[var(--priority-high-soft)] text-[var(--priority-high-text)] normal-case tracking-[0.08em]",
  urgent:
    "border-[var(--priority-urgent-border)] bg-[var(--priority-urgent-soft)] text-[var(--priority-urgent-text)] normal-case tracking-[0.08em]",
};

const PRIORITY_CARD_CLASSES: Record<Task["priority"], string> = {
  low: "border-[var(--priority-low-border)] bg-[var(--priority-low-card)]",
  medium: "border-[var(--priority-medium-border)] bg-[var(--priority-medium-card)]",
  high: "border-[var(--priority-high-border)] bg-[var(--priority-high-card)]",
  urgent: "border-[var(--priority-urgent-border)] bg-[var(--priority-urgent-card)]",
};

const PRIORITY_TIMELINE_BLOCK_CLASSES: Record<Task["priority"], string> = {
  low: "border-[var(--priority-low-border)] bg-[var(--priority-low-block)] shadow-[0_20px_50px_rgba(120,138,175,0.24)]",
  medium: "border-[var(--priority-medium-border)] bg-[var(--priority-medium-block)] shadow-[0_20px_50px_rgba(94,112,214,0.24)]",
  high: "border-[var(--priority-high-border)] bg-[var(--priority-high-block)] shadow-[0_22px_54px_rgba(255,111,59,0.26)]",
  urgent: "border-[var(--priority-urgent-border)] bg-[var(--priority-urgent-block)] shadow-[0_22px_54px_rgba(255,90,64,0.3)]",
};

export function formatTaskPriority(priority: Task["priority"]) {
  return PRIORITY_LABELS[priority];
}

export function formatTaskLifecycle(value: TaskLifecycleValue) {
  return LIFECYCLE_LABELS[value];
}

export function getTaskPriorityBadgeClass(priority: Task["priority"]) {
  return PRIORITY_BADGE_CLASSES[priority];
}

export function getTaskPriorityCardClass(priority: Task["priority"]) {
  return PRIORITY_CARD_CLASSES[priority];
}

export function getTaskPriorityTimelineBlockClass(priority: Task["priority"]) {
  return PRIORITY_TIMELINE_BLOCK_CLASSES[priority];
}

export function getTaskLifecycleValue(task: Pick<Task, "status"> | null): TaskLifecycleValue {
  if (!task) {
    return "active";
  }

  if (task.status === "done") {
    return "done";
  }

  if (task.status === "archived") {
    return "archived";
  }

  return "active";
}

export function resolveActiveTaskStatus(task: Pick<Task, "id" | "scheduledBlockId">, activeTimerTaskId: string | null) {
  if (activeTimerTaskId === task.id) {
    return "in_progress" as const;
  }

  return task.scheduledBlockId ? "scheduled" : "planned";
}
