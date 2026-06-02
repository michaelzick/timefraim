import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@timefraim/shared";
import { CalendarPlus, ChevronDown, ExternalLink, GripVertical, Inbox, Play, Square, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KanbanStatus } from "@/features/kanban/kanban-types";
import {
  PRIORITY_OPTIONS,
  formatTaskPriority,
  getTaskPriorityBadgeClass,
  getTaskPriorityCardClass,
} from "@/features/planner/task-presentation";
import { buildPlannerTaskHref } from "@/features/kanban/kanban-utils";
import { formatElapsed, useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { cn } from "@/lib/utils";

type KanbanCardProps = {
  activeTimerTaskId: string | null;
  activeTimerStartedAt: string | null;
  date: string;
  isDragOverlay?: boolean;
  kanbanStatus: KanbanStatus;
  scheduleLabel: string;
  task: Task;
  onDeleteTask: (task: Task) => void;
  onPlanTask: (task: Task) => void;
  onPriorityChange: (task: Task, priority: Task["priority"]) => void;
  onRemoveTask: (task: Task) => void;
  onStartTimer: (taskId: string) => void;
  onStopTimer: () => void;
};

export function KanbanCard({
  activeTimerTaskId,
  activeTimerStartedAt,
  date,
  isDragOverlay = false,
  kanbanStatus,
  scheduleLabel,
  task,
  onDeleteTask,
  onPlanTask,
  onPriorityChange,
  onRemoveTask,
  onStartTimer,
  onStopTimer,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `kanban-task-${task.id}`,
    data: { dragType: "kanban-task", task },
    disabled: isDragOverlay,
  });
  const isRunning = activeTimerTaskId === task.id;
  const elapsed = useElapsedSeconds(isRunning ? activeTimerStartedAt : null);
  const canPlan = !task.scheduledBlockId && task.status !== "done";
  const canDelete = kanbanStatus === "inbox";
  const canRemove = kanbanStatus !== "inbox";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Priority for ${task.title}`}
              className={cn(
                "inline-grid h-6 min-w-[86px] grid-cols-[1fr_0.75rem] items-center gap-1 rounded-full border py-0 pl-3 pr-2 text-center font-semibold outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[var(--timeline-selection-ring)]",
                getTaskPriorityBadgeClass(task.priority),
              )}
            >
              <span className="min-w-0 text-center text-xs leading-none">{formatTaskPriority(task.priority)}</span>
              <ChevronDown className="pointer-events-none h-3 w-3 text-[var(--planner-surface-meta)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[88px] rounded-xl p-1 text-xs">
            {PRIORITY_OPTIONS.map((priority) => (
              <DropdownMenuItem
                key={priority}
                className="h-7 justify-center rounded-lg px-2 py-0 text-center leading-none"
                onSelect={() => onPriorityChange(task, priority)}
              >
                <span
                  className={cn(
                    "inline-flex h-5 min-w-[64px] items-center justify-center rounded-full border px-2 font-semibold",
                    getTaskPriorityBadgeClass(priority),
                  )}
                >
                  <span className="text-xs leading-none">{formatTaskPriority(priority)}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
          {isRunning ? <span className="font-mono tabular-nums text-[var(--accent)]">Running {formatElapsed(elapsed)}</span> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {canPlan ? (
          <Button type="button" size="sm" onClick={() => onPlanTask(task)}>
            <CalendarPlus className="h-4 w-4" />
            Plan
          </Button>
        ) : null}
        {isRunning ? (
          <Button type="button" size="sm" variant="secondary" onClick={onStopTimer}>
            <Square className="h-4 w-4" />
            Stop
          </Button>
        ) : task.status !== "done" ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onStartTimer(task.id)}>
            <Play className="h-4 w-4" />
            Timer
          </Button>
        ) : null}
        {canRemove ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => onRemoveTask(task)}>
            <Inbox className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-200"
            onClick={() => onDeleteTask(task)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
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
