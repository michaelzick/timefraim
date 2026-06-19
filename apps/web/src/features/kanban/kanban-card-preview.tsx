import type { Task } from "@timefraim/shared";
import { Badge } from "@/components/ui/badge";
import { TaskCategoryIcon } from "@/features/planner/task-category-icon";
import {
  formatTaskPriority,
  getTaskPriorityBadgeClass,
  getTaskPriorityCardClass,
} from "@/features/planner/task-presentation";
import { cn } from "@/lib/utils";
import type { KanbanStatus } from "@/features/kanban/kanban-types";

export function getPlanCta(kanbanStatus: KanbanStatus): { label: string; target: KanbanStatus } | null {
  if (kanbanStatus === "inbox") {
    return { label: "Plan", target: "planned" };
  }
  if (kanbanStatus === "planned") {
    return { label: "Schedule", target: "scheduled" };
  }
  return null;
}

export function KanbanCardPreview({ task }: { task: Task }) {
  return (
    <article
      className={cn(
        "w-[280px] rounded-[24px] border p-4 shadow-[var(--shadow-elevated)]",
        getTaskPriorityCardClass(task.priority),
      )}
    >
      <div className="flex items-center gap-1.5">
        <TaskCategoryIcon category={task.category} />
        <Badge className={getTaskPriorityBadgeClass(task.priority)}>{formatTaskPriority(task.priority)}</Badge>
      </div>
      <h4 className="mt-3 text-sm font-semibold leading-5 text-[var(--planner-surface-title)]">{task.title}</h4>
      <div className="mt-2 text-xs text-[var(--planner-surface-meta)]">{task.estimatedMinutes} min</div>
    </article>
  );
}
