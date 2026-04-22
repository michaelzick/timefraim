import type { DayPlan } from "@timefraim/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

type ActivityLogCardProps = {
  dayPlan: DayPlan;
};

export function ActivityLogCard({ dayPlan }: ActivityLogCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const count = dayPlan.auditLogs.length;

  return (
    <Card>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Activity</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--heading)]">Today's changes · {count}</h2>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
        )}
      </button>
      {isOpen ? (
        <div className="mt-4 space-y-3">
          {count === 0 ? (
            <p className="text-sm text-[var(--muted)]">No activity logged yet today.</p>
          ) : (
            dayPlan.auditLogs.map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-[var(--badge-border)] bg-[var(--badge-bg)] px-2.5 py-1 text-xs font-medium text-[var(--heading)]">
                    {entry.actorRole}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[var(--heading)]">{entry.displaySummary}</p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </Card>
  );
}
