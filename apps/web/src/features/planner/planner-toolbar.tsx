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
  search: string;
  onDateChange: (nextDate: string) => void;
  onSyncCalendar: () => void;
  onSearchChange: (value: string) => void;
};

export function PlannerToolbar({
  date,
  isSyncing,
  linkedGoogleEmail,
  search,
  onDateChange,
  onSyncCalendar,
  onSearchChange,
}: PlannerToolbarProps) {
  const today = getTodayDate();
  const isToday = date === today;

  return (
    <section
      aria-label="Planner toolbar"
      className="flex flex-col gap-4 rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-elevated)] p-4 shadow-[var(--shadow-elevated)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Previous day"
          className="h-11 w-11 p-0"
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
          variant="secondary"
          aria-label="Jump to today"
          disabled={isToday}
          onClick={() => onDateChange(today)}
        >
          Today
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Next day"
          className="h-11 w-11 p-0"
          onClick={() => onDateChange(stepLocalDate(date, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="secondary" onClick={onSyncCalendar} disabled={isSyncing}>
          {isSyncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Sync calendar
        </Button>
        {linkedGoogleEmail ? <Badge>Synced with {linkedGoogleEmail}</Badge> : null}
      </div>
      <Input
        aria-label="Filter tasks"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Filter tasks"
        className="w-full lg:max-w-[240px]"
      />
    </section>
  );
}
