import { stepLocalDate } from "@timefraim/shared";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTodayDate } from "@/lib/utils";

type PlannerToolbarProps = {
  date: string;
  isSyncing: boolean;
  linkedGoogleEmail: string | null;
  onDateChange: (nextDate: string) => void;
  onSyncCalendar: () => void;
};

export function PlannerToolbar({
  date,
  isSyncing,
  linkedGoogleEmail,
  onDateChange,
  onSyncCalendar,
}: PlannerToolbarProps) {
  const today = getTodayDate();
  const isToday = date === today;
  const syncCalendarContent = isSyncing ? (
    <LoaderCircle className="h-4 w-4 animate-spin" />
  ) : (
    <RefreshCcw className="h-4 w-4" />
  );

  return (
    <section
      aria-label="Planner toolbar"
      className="flex flex-col gap-4 rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-elevated)] p-4 shadow-[var(--shadow-elevated)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
        <div className="flex items-center gap-2 xl:contents">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Previous day"
            className="h-11 w-11 shrink-0 p-0 xl:order-1"
            onClick={() => onDateChange(stepLocalDate(date, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            aria-label="Planner date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="min-w-0 flex-1 xl:order-2 xl:w-[180px] xl:flex-none"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Next day"
            className="h-11 w-11 shrink-0 p-0 xl:order-4"
            onClick={() => onDateChange(stepLocalDate(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:contents">
          <Button
            type="button"
            variant="secondary"
            aria-label="Jump to today"
            className="xl:order-3"
            disabled={isToday}
            onClick={() => onDateChange(today)}
          >
            Today
          </Button>
          <Button
            className="whitespace-nowrap xl:order-5"
            variant="secondary"
            onClick={onSyncCalendar}
            disabled={isSyncing}
          >
            {syncCalendarContent}
            Sync calendar
          </Button>
          {linkedGoogleEmail ? (
            <Badge className="min-w-0 max-w-full truncate xl:order-6 xl:ml-3">
              Synced with {linkedGoogleEmail}
            </Badge>
          ) : null}
        </div>
      </div>
    </section>
  );
}
