import { stepLocalDate } from "@timefraim/shared";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PlannerSummaryCardProps = {
  date: string;
  isSyncing: boolean;
  onDateChange: (nextDate: string) => void;
  onSyncCalendar: () => void;
};

export function PlannerSummaryCard({
  date,
  isSyncing,
  onDateChange,
  onSyncCalendar,
}: PlannerSummaryCardProps) {
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Daily planner</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Focus on what matters today.</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Previous day"
              className="h-11 w-11 p-0 text-[var(--muted-strong)] hover:bg-white/10 hover:text-white"
              onClick={() => onDateChange(stepLocalDate(date, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              aria-label="Planner date"
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className="w-[180px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Next day"
              className="h-11 w-11 p-0 text-[var(--muted-strong)] hover:bg-white/10 hover:text-white"
              onClick={() => onDateChange(stepLocalDate(date, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="secondary" onClick={onSyncCalendar} disabled={isSyncing}>
            {isSyncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Sync calendar
          </Button>
        </div>
      </div>
    </Card>
  );
}
