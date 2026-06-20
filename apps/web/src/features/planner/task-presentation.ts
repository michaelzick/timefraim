import type { Task, TimerSession, TogglIntegrationSettings } from "@timefraim/shared";
import { Briefcase, User, type LucideIcon } from "lucide-react";
import type { TaskLifecycleValue } from "@/features/planner/types";

export const PRIORITY_OPTIONS: Task["priority"][] = ["low", "medium", "high", "urgent"];
export const CATEGORY_OPTIONS: Task["category"][] = ["personal", "work"];
export const TASK_LIFECYCLE_OPTIONS: TaskLifecycleValue[] = ["active", "done"];

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const CATEGORY_LABELS: Record<Task["category"], string> = {
  personal: "Personal",
  work: "Work",
};

const CATEGORY_ICONS: Record<Task["category"], LucideIcon> = {
  personal: User,
  work: Briefcase,
};

const LIFECYCLE_LABELS: Record<TaskLifecycleValue, string> = {
  active: "Active",
  done: "Done",
};

const PRIORITY_BADGE_CLASSES: Record<Task["priority"], string> = {
  low: "border-[var(--priority-low-border)] bg-[var(--priority-low-soft)] text-[var(--priority-low-text)] normal-case tracking-[0.08em]",
  medium:
    "border-[var(--priority-medium-border)] bg-[var(--priority-medium-soft)] text-[var(--priority-medium-text)] normal-case tracking-[0.08em]",
  high: "border-[var(--priority-high-border)] bg-[var(--priority-high-soft)] text-[var(--priority-high-text)] normal-case tracking-[0.08em]",
  urgent:
    "border-[var(--priority-urgent-border)] bg-[var(--priority-urgent-soft)] text-[var(--priority-urgent-text)] normal-case tracking-[0.08em]",
};

const PRIORITY_HEADER_BADGE_CLASSES: Record<Task["priority"], string> = {
  low: "border-[var(--priority-low-border)] bg-[var(--priority-low-card)] text-[var(--priority-low-text)] normal-case tracking-[0.08em]",
  medium:
    "border-[var(--priority-medium-border)] bg-[var(--priority-medium-card)] text-[var(--priority-medium-text)] normal-case tracking-[0.08em]",
  high: "border-[var(--priority-high-border)] bg-[var(--priority-high-card)] text-[var(--priority-high-text)] normal-case tracking-[0.08em]",
  urgent:
    "border-[var(--priority-urgent-border)] bg-[var(--priority-urgent-card)] text-[var(--priority-urgent-text)] normal-case tracking-[0.08em]",
};

const PRIORITY_CARD_CLASSES: Record<Task["priority"], string> = {
  low: "border-[var(--priority-low-border)] bg-[var(--priority-low-card)]",
  medium: "border-[var(--priority-medium-border)] bg-[var(--priority-medium-card)]",
  high: "border-[var(--priority-high-border)] bg-[var(--priority-high-card)]",
  urgent: "border-[var(--priority-urgent-border)] bg-[var(--priority-urgent-card)]",
};

const PRIORITY_TIMELINE_BLOCK_CLASSES: Record<Task["priority"], string> = {
  low: "border-[var(--priority-low-border)] bg-[var(--priority-low-block)]",
  medium: "border-[var(--priority-medium-border)] bg-[var(--priority-medium-block)]",
  high: "border-[var(--priority-high-border)] bg-[var(--priority-high-block)]",
  urgent: "border-[var(--priority-urgent-border)] bg-[var(--priority-urgent-block)]",
};

export function formatTaskPriority(priority: Task["priority"]) {
  return PRIORITY_LABELS[priority];
}

export function formatTaskCategory(category: Task["category"]) {
  return CATEGORY_LABELS[category];
}

export function getCategoryIcon(category: Task["category"]): LucideIcon {
  return CATEGORY_ICONS[category];
}

export function formatTaskLifecycle(value: TaskLifecycleValue) {
  return LIFECYCLE_LABELS[value];
}

export function getTaskPriorityBadgeClass(priority: Task["priority"]) {
  return PRIORITY_BADGE_CLASSES[priority];
}

export function getTaskPriorityHeaderBadgeClass(priority: Task["priority"]) {
  return PRIORITY_HEADER_BADGE_CLASSES[priority];
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

  return "active";
}

export function formatActiveTimerHeading(
  activeTimer: TimerSession,
  tasks: Task[],
  togglSettings: TogglIntegrationSettings,
): string {
  if (!activeTimer.taskId) {
    return "Calendar event";
  }

  const task = tasks.find((candidate) => candidate.id === activeTimer.taskId);
  if (!task) {
    return "Active focus timer";
  }

  const project = task.togglProjectId
    ? togglSettings.availableProjects.find((candidate) => candidate.id === task.togglProjectId)
    : null;
  const projectName = project?.name ?? "Without project";

  return `${task.title} (${projectName})`;
}
