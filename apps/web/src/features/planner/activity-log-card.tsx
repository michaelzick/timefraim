import type { DayPlan } from "@timefraim/shared";
import { Card } from "@/components/ui/card";

type ActivityLogCardProps = {
  dayPlan: DayPlan;
};

export function ActivityLogCard({ dayPlan }: ActivityLogCardProps) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Activity</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Today's changes</h2>
      <div className="mt-4 space-y-3">
        {dayPlan.auditLogs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No activity logged yet today.</p>
        ) : (
          dayPlan.auditLogs.map((entry) => (
            <div key={entry.id} className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-white">
                  {entry.actorRole}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-white">{entry.diffSummary}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
