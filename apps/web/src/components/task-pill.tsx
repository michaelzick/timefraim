import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@timefraim/shared";
import { Check, Clock3, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskPillKebab } from "@/components/task-pill-kebab";
import { TaskCategoryIcon } from "@/features/planner/task-category-icon";
import {
  formatTaskPriority,
  getTaskPriorityBadgeClass,
  getTaskPriorityCardClass,
} from "@/features/planner/task-presentation";
import { cn } from "@/lib/utils";

export type TaskPillRunState = "idle" | "running" | "done";

export function TaskPill({
  task,
  active,
  isCopyDragSource = false,
  runState = "idle",
  onSelect,
  onDelete,
  onDuplicate,
  onStartTimer,
  onMarkDone,
}: {
  task: Task;
  active: boolean;
  isCopyDragSource?: boolean;
  runState?: TaskPillRunState;
  onSelect: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onStartTimer?: () => void;
  onMarkDone?: () => void;
}) {
  const hasMenuActions = Boolean(onDuplicate || onStartTimer || onMarkDone || onDelete);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { dragType: "queue-task", task },
  });
  const dragTransform = isCopyDragSource ? undefined : CSS.Translate.toString(transform);

  return (
    <div
      ref={setNodeRef}
      data-planner-selectable="true"
      style={{ transform: dragTransform }}
      className={cn(
        "group w-full cursor-pointer rounded-[24px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--timeline-selection-ring)]",
        getTaskPriorityCardClass(task.priority),
        active && "border-[var(--timeline-selection-ring)]",
        isDragging && !isCopyDragSource && "opacity-65",
        runState === "running" && "adhd-pulse",
        runState === "done" && "opacity-60",
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      {...listeners}
      {...attributes}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        {runState === "running" ? (
          <Badge className="border-[var(--accent)] bg-[var(--accent-soft)] uppercase tracking-[0.18em] text-[var(--accent)]">
            Running
          </Badge>
        ) : (
          <div className="flex items-center gap-1.5">
            <TaskCategoryIcon category={task.category} />
            <Badge className={getTaskPriorityBadgeClass(task.priority)}>{formatTaskPriority(task.priority)}</Badge>
          </div>
        )}
        <div className="flex items-center gap-1">
          {runState === "done" ? (
            <span
              aria-label="Completed"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          ) : null}
          {hasMenuActions && onDuplicate ? (
            <TaskPillKebab
              label={task.title}
              onDuplicate={onDuplicate}
              onStartTimer={onStartTimer}
              onMarkDone={onMarkDone}
              onDelete={onDelete}
            />
          ) : null}
          <GripVertical className="h-4 w-4 text-[var(--planner-surface-meta)]" />
        </div>
      </div>
      <div className="space-y-2">
        <h3
          className={cn(
            "font-medium text-[var(--planner-surface-title)]",
            runState === "running" && "flex items-center gap-2",
            runState === "done" && "line-through",
          )}
        >
          {runState === "running" ? (
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
          ) : null}
          <span>{task.title}</span>
        </h3>
        <div className="flex items-center gap-2 text-xs text-[var(--planner-surface-meta)]">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{task.estimatedMinutes} min</span>
        </div>
      </div>
    </div>
  );
}
