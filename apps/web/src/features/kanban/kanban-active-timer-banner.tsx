import type { DayPlan, TogglIntegrationSettings } from "@timefraim/shared";
import { Hourglass, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTaskScheduleLabel } from "@/features/kanban/kanban-schedule-label";
import { TaskCategoryIcon } from "@/features/planner/task-category-icon";
import {
  formatActiveTimerHeading,
  formatTaskPriority,
  getTaskPriorityBadgeClass,
} from "@/features/planner/task-presentation";
import { formatElapsed, useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { cn } from "@/lib/utils";

type KanbanActiveTimerBannerProps = {
  dayPlan: DayPlan;
  togglSettings: TogglIntegrationSettings;
  onStopTimer: () => void;
};

export function KanbanActiveTimerBanner({
  dayPlan,
  togglSettings,
  onStopTimer,
}: KanbanActiveTimerBannerProps) {
  const activeTimer = dayPlan.activeTimer;
  const elapsed = useElapsedSeconds(activeTimer?.startedAt ?? null);

  if (!activeTimer) {
    return null;
  }

  const task = activeTimer.taskId
    ? dayPlan.tasks.find((candidate) => candidate.id === activeTimer.taskId) ?? null
    : null;
  const heading = formatActiveTimerHeading(activeTimer, dayPlan.tasks, togglSettings);

  return (
    <section
      aria-label="Active timer"
      className={cn(
        "adhd-pulse flex flex-col gap-4 rounded-[24px] border border-[rgba(255,111,59,0.45)] bg-[rgba(255,111,59,0.08)] p-4",
        "sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
          <Hourglass className="h-3.5 w-3.5" />
          <span>Running</span>
        </div>
        <p className="truncate text-sm font-semibold text-[var(--heading)]">{heading}</p>
        {task ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--planner-surface-meta)]">
            <TaskCategoryIcon category={task.category} />
            <Badge className={getTaskPriorityBadgeClass(task.priority)}>
              {formatTaskPriority(task.priority)}
            </Badge>
            <span>{task.estimatedMinutes} min</span>
            <span>{getTaskScheduleLabel(task, dayPlan.scheduleBlocks)}</span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--accent)] sm:text-3xl">
          {formatElapsed(elapsed)}
        </p>
        <Button onClick={onStopTimer}>
          <Square className="h-4 w-4" />
          Stop timer
        </Button>
      </div>
    </section>
  );
}
