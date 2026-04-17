import * as Tabs from "@radix-ui/react-tabs";
import type { DayPlan, TogglIntegrationSettings } from "@timefraim/shared";
import { Hourglass, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatActiveTimerHeading } from "@/features/planner/task-presentation";
import { formatTime } from "@/lib/utils";

type PlannerActivityCardProps = {
  dayPlan: DayPlan;
  togglSettings: TogglIntegrationSettings;
  onStopTimer: () => void;
};

export function PlannerActivityCard({
  dayPlan,
  togglSettings,
  onStopTimer,
}: PlannerActivityCardProps) {
  return (
    <Card>
      <Tabs.Root defaultValue="timer">
        <Tabs.List className="mb-5 grid grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1">
          <Tabs.Trigger className="rounded-full px-3 py-2 text-sm text-[var(--muted)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--surface)]" value="timer">
            Timer
          </Tabs.Trigger>
          <Tabs.Trigger className="rounded-full px-3 py-2 text-sm text-[var(--muted)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--surface)]" value="activity">
            Activity
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="timer" className="space-y-4">
          {dayPlan.activeTimer ? (
            <div className="rounded-[24px] border border-[rgba(255,111,59,0.35)] bg-[rgba(255,111,59,0.1)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Hourglass className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-sm font-medium text-white">
                  {formatActiveTimerHeading(dayPlan.activeTimer, dayPlan.tasks, togglSettings)}
                </span>
              </div>
              <p className="text-sm text-[var(--muted-strong)]">
                Started at {formatTime(dayPlan.activeTimer.startedAt)}
              </p>
              <Button className="mt-4" onClick={onStopTimer}>
                <Square className="h-4 w-4" />
                Stop active timer
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No timer is running. Start one from the selected task.</p>
          )}
        </Tabs.Content>

        <Tabs.Content value="activity" className="space-y-3">
          {dayPlan.auditLogs.map((entry) => (
            <div key={entry.id} className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-white">
                  {entry.actorRole}
                </span>
                <span className="text-xs text-[var(--muted)]">{new Date(entry.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-white">{entry.diffSummary}</p>
            </div>
          ))}
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  );
}
