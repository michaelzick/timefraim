import type { DayPlan, TogglIntegrationSettings } from "@timefraim/shared";
import { Hourglass, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatActiveTimerHeading } from "@/features/planner/task-presentation";
import { formatElapsed, useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { cn, formatTime } from "@/lib/utils";

type ActiveTimerPanelProps = {
  dayPlan: DayPlan;
  togglSettings: TogglIntegrationSettings;
  onStopTimer: () => void;
  onSelectTimerTask?: (taskId: string) => void;
};

export function ActiveTimerPanel({
  dayPlan,
  togglSettings,
  onStopTimer,
  onSelectTimerTask,
}: ActiveTimerPanelProps) {
  const activeTimer = dayPlan.activeTimer;
  const elapsed = useElapsedSeconds(activeTimer?.startedAt ?? null);

  if (!activeTimer) {
    return null;
  }

  const heading = formatActiveTimerHeading(activeTimer, dayPlan.tasks, togglSettings);

  return (
    <Card
      className={cn(
        "border-[rgba(255,111,59,0.45)] bg-[rgba(255,111,59,0.08)] adhd-pulse",
      )}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
        <Hourglass className="h-3.5 w-3.5" />
        <span>Running</span>
      </div>
      <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-[var(--accent)]">
        {formatElapsed(elapsed)}
      </p>
      <p className="mt-3 text-sm font-medium text-[var(--heading)]">{heading}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Started at {formatTime(activeTimer.startedAt)}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={onStopTimer}>
          <Square className="h-4 w-4" />
          Stop timer
        </Button>
        {activeTimer.taskId && onSelectTimerTask ? (
          <button
            type="button"
            data-planner-selectable="true"
            className="cursor-pointer text-sm text-[var(--muted-strong)] underline-offset-4 hover:text-[var(--heading)] hover:underline"
            onClick={() => onSelectTimerTask(activeTimer.taskId as string)}
          >
            Open task
          </button>
        ) : null}
      </div>
    </Card>
  );
}
