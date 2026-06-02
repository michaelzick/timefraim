import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@timefraim/shared";
import { CalendarPlus, ExternalLink, GripVertical, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatTaskPriority,
  getTaskPriorityBadgeClass,
  getTaskPriorityCardClass,
} from "@/features/planner/task-presentation";
import { buildPlannerTaskHref } from "@/features/kanban/kanban-utils";
import { cn } from "@/lib/utils";

type KanbanCardProps = {
  activeTimerTaskId: string | null;
  date: string;
  isDragOverlay?: boolean;
  scheduleLabel: string;
  task: Task;
  onPlanTask: (task: Task) => void;
  onStartTimer: (taskId: string) => void;
};

export function KanbanCard({
  activeTimerTaskId,
  date,
  isDragOverlay = false,
  scheduleLabel,
  task,
  onPlanTask,
  onStartTimer,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `kanban-task-${task.id}`,
    data: { dragType: "kanban-task", task },
    disabled: isDragOverlay,
  });
  const isRunning = activeTimerTaskId === task.id;
  const canPlan = !task.scheduledBlockId && task.status !== "done";

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "rounded-[24px] border p-4 shadow-sm transition",
        getTaskPriorityCardClass(task.priority),
        isDragging && "opacity-60",
        isDragOverlay && "w-[280px] shadow-[var(--shadow-elevated)]",
        isRunning && "adhd-pulse",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <Badge className={getTaskPriorityBadgeClass(task.priority)}>{formatTaskPriority(task.priority)}</Badge>
        <button
          type="button"
          className="cursor-grab rounded-full p-1 text-[var(--planner-surface-meta)] transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--timeline-selection-ring)]"
          aria-label={`Drag ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold leading-5 text-[var(--planner-surface-title)]">{task.title}</h3>
        {task.notes ? (
          <p className="line-clamp-2 text-xs leading-5 text-[var(--planner-surface-meta)]">{task.notes}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-xs text-[var(--planner-surface-meta)]">
          <span>{task.estimatedMinutes} min</span>
          <span>{scheduleLabel}</span>
          {isRunning ? <span>Running</span> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {canPlan ? (
          <Button type="button" size="sm" onClick={() => onPlanTask(task)}>
            <CalendarPlus className="h-4 w-4" />
            Plan
          </Button>
        ) : null}
        {task.status !== "done" ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onStartTimer(task.id)}>
            <Play className="h-4 w-4" />
            Timer
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost">
          <Link to={buildPlannerTaskHref(date, task.id)}>
            <ExternalLink className="h-4 w-4" />
            Planner
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function KanbanCardPreview({ task }: { task: Task }) {
  return (
    <article
      className={cn(
        "w-[280px] rounded-[24px] border p-4 shadow-[var(--shadow-elevated)]",
        getTaskPriorityCardClass(task.priority),
      )}
    >
      <Badge className={getTaskPriorityBadgeClass(task.priority)}>{formatTaskPriority(task.priority)}</Badge>
      <h3 className="mt-3 text-sm font-semibold leading-5 text-[var(--planner-surface-title)]">{task.title}</h3>
      <div className="mt-2 text-xs text-[var(--planner-surface-meta)]">{task.estimatedMinutes} min</div>
    </article>
  );
}
