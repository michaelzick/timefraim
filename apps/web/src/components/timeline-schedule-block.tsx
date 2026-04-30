import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ScheduleBlock, Task } from "@timefraim/shared";
import { Check, Undo2 } from "lucide-react";
import { TaskPillKebab } from "@/components/task-pill-kebab";
import {
  TimelineResizeHandle,
  useTimelineBlockResize,
} from "@/components/timeline-resize-handle";
import { getTimelinePlacement, isShortBlock } from "@/components/timeline-geometry";
import { Badge } from "@/components/ui/badge";
import {
  formatTaskPriority,
  getTaskPriorityBadgeClass,
  getTaskPriorityTimelineBlockClass,
} from "@/features/planner/task-presentation";
import { formatElapsed, useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { cn, formatTime } from "@/lib/utils";

export type TimelineBlockRunState = "idle" | "running" | "done";

type TimelineScheduleBlockProps = {
  block: ScheduleBlock;
  date: string;
  task: Task | undefined;
  isSelected: boolean;
  runState: TimelineBlockRunState;
  runningStartedAt: string | null;
  onDeleteScheduleBlock: (scheduleBlockId: string, title: string) => void;
  onDuplicateTask?: (task: Task) => void;
  onStartTaskTimer?: (taskId: string) => void;
  onMarkTaskDone?: (task: Task) => void;
  onResizeTaskDuration?: (task: Task, durationMinutes: number) => void;
  onSelectTask: (taskId: string) => void;
};

export function TimelineScheduleBlock({
  block,
  date,
  task,
  isSelected,
  runState,
  runningStartedAt,
  onDeleteScheduleBlock,
  onDuplicateTask,
  onStartTaskTimer,
  onMarkTaskDone,
  onResizeTaskDuration,
  onSelectTask,
}: TimelineScheduleBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: { dragType: "schedule-block", scheduleBlock: block, task },
  });
  const elapsed = useElapsedSeconds(runState === "running" ? runningStartedAt : null);
  const resize = useTimelineBlockResize({
    block,
    date,
    disabled: !task || !onResizeTaskDuration,
    onResizeEnd: (durationMinutes) => {
      if (task && onResizeTaskDuration) {
        onResizeTaskDuration(task, durationMinutes);
      }
    },
  });
  const displayEndAt = resize.previewEndAt ?? block.endAt;
  const placement = getTimelinePlacement(date, block.startAt, displayEndAt);
  const priority = task?.priority ?? "medium";
  const title = task?.title ?? "Scheduled task";

  if (!placement) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        top: placement.top,
        height: placement.height,
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(
        "absolute left-2 right-2 z-10 cursor-pointer overflow-hidden rounded-[24px] border px-4 pb-7 pt-4 transition sm:left-8 sm:right-8",
        getTaskPriorityTimelineBlockClass(priority),
        isDragging && "opacity-75",
        resize.isResizing && "ring-2 ring-[var(--timeline-selection-ring)]",
        isSelected && "border-[var(--timeline-selection-ring)]",
        runState === "running" && "adhd-pulse",
        runState === "done" && "opacity-45",
      )}
      onClick={() => onSelectTask(block.taskId)}
      {...listeners}
      {...attributes}
    >
      {runState === "done" ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[var(--success-text)]" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {isShortBlock(block.startAt, displayEndAt) ? (
            <p
              className={cn(
                "truncate font-semibold text-[var(--planner-surface-title)]",
                runState === "done" && "line-through",
              )}
            >
              {title}
              <span className="ml-2 text-xs font-normal text-[var(--planner-surface-meta)]">
                {formatTime(block.startAt)} to {formatTime(displayEndAt)}
              </span>
              {runState === "running" ? (
                <span
                  data-testid="inline-running-timer"
                  className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]"
                >
                  · {formatElapsed(elapsed)}
                </span>
              ) : null}
            </p>
          ) : (
            <>
              <p
                className={cn(
                  "truncate font-semibold text-[var(--planner-surface-title)]",
                  runState === "done" && "line-through",
                )}
              >
                {title}
              </p>
              <p className="mt-1 text-xs text-[var(--planner-surface-meta)]">
                {formatTime(block.startAt)} to {formatTime(displayEndAt)}
              </p>
              {runState === "running" ? (
                <Badge className="mt-2 border-[var(--accent)] bg-[var(--accent-soft)] font-mono uppercase tracking-[0.18em] text-[var(--accent)]">
                  Running · {formatElapsed(elapsed)}
                </Badge>
              ) : null}
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {runState === "done" ? (
            <span
              aria-label="Completed"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success-text)]"
            >
              <Check className="h-4 w-4" />
            </span>
          ) : null}
          <Badge className={getTaskPriorityBadgeClass(priority)}>{formatTaskPriority(priority)}</Badge>
          {task && onDuplicateTask ? (
            <TaskPillKebab
              label={title}
              onDuplicate={() => onDuplicateTask(task)}
              onStartTimer={onStartTaskTimer ? () => onStartTaskTimer(task.id) : undefined}
              onMarkDone={onMarkTaskDone ? () => onMarkTaskDone(task) : undefined}
              onDelete={() => onDeleteScheduleBlock(block.id, title)}
              deleteLabel="Remove"
              deleteIcon={Undo2}
            />
          ) : null}
        </div>
      </div>
      {task && onResizeTaskDuration ? (
        <TimelineResizeHandle
          currentDurationMinutes={resize.currentDurationMinutes}
          isResizing={resize.isResizing}
          previewDurationMinutes={resize.previewDurationMinutes}
          {...resize.resizeHandleProps}
        />
      ) : null}
    </div>
  );
}
