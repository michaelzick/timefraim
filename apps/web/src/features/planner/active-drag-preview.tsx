import type { ScheduleBlock, Task } from "@timefraim/shared";
import { Clock3, Copy, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatTaskPriority,
  getTaskPriorityBadgeClass,
  getTaskPriorityCardClass,
  getTaskPriorityTimelineBlockClass,
} from "@/features/planner/task-presentation";
import { cn } from "@/lib/utils";

export type ActiveDragPayload =
  | { dragType: "queue-task"; task: Task }
  | { dragType: "queue-task-copy"; task: Task }
  | { dragType: "schedule-block"; scheduleBlock: ScheduleBlock; task: Task | undefined }
  | { dragType: "schedule-block-copy"; scheduleBlock: ScheduleBlock; task: Task | undefined };

export function ActiveDragPreview({ payload }: { payload: ActiveDragPayload }) {
  const isCopy = payload.dragType === "queue-task-copy" || payload.dragType === "schedule-block-copy";

  if (payload.dragType === "queue-task" || payload.dragType === "queue-task-copy") {
    return <QueueTaskPreview task={payload.task} isCopy={isCopy} />;
  }

  return <ScheduleBlockPreview task={payload.task} isCopy={isCopy} />;
}

function QueueTaskPreview({ task, isCopy }: { task: Task; isCopy: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none relative w-[320px] rounded-[24px] border p-4 shadow-[0_32px_80px_rgba(5,8,18,0.65)] backdrop-blur-xl",
        getTaskPriorityCardClass(task.priority),
      )}
    >
      {isCopy ? <DuplicateBadge /> : null}
      <div className="mb-3 flex items-center justify-between gap-3">
        <Badge className={getTaskPriorityBadgeClass(task.priority)}>{formatTaskPriority(task.priority)}</Badge>
        <GripVertical className="h-4 w-4 text-[var(--planner-surface-meta)]" />
      </div>
      <div className="space-y-2">
        <h3 className="truncate font-medium text-[var(--planner-surface-title)]">{task.title}</h3>
        <div className="flex items-center gap-2 text-xs text-[var(--planner-surface-meta)]">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{task.estimatedMinutes} min</span>
        </div>
      </div>
    </div>
  );
}

function ScheduleBlockPreview({ task, isCopy }: { task: Task | undefined; isCopy: boolean }) {
  const priority = task?.priority ?? "medium";
  return (
    <div
      className={cn(
        "pointer-events-none relative w-[360px] rounded-[24px] border p-4 opacity-75 shadow-[0_32px_80px_rgba(5,8,18,0.65)] backdrop-blur-xl",
        getTaskPriorityTimelineBlockClass(priority),
      )}
    >
      {isCopy ? <DuplicateBadge /> : null}
      <div className="flex items-start justify-between gap-3">
        <p className="truncate font-semibold text-[var(--planner-surface-title)]">
          {task?.title ?? "Scheduled task"}
        </p>
        <Badge className={getTaskPriorityBadgeClass(priority)}>{formatTaskPriority(priority)}</Badge>
      </div>
    </div>
  );
}

function DuplicateBadge() {
  return (
    <span className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-foreground)] shadow">
      <Copy className="h-3 w-3" />
      Duplicate
    </span>
  );
}
