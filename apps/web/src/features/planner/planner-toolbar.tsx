import { stepLocalDate } from "@timefraim/shared";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlannerToolbarProps = {
  date: string;
  isSyncing: boolean;
  search: string;
  onDateChange: (nextDate: string) => void;
  onSyncCalendar: () => void;
  onSearchChange: (value: string) => void;
};

export function PlannerToolbar({
  date,
  isSyncing,
  search,
  onDateChange,
  onSyncCalendar,
  onSearchChange,
}: PlannerToolbarProps) {
  return (
    <section
      aria-label="Planner toolbar"
      className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-[rgba(8,12,24,0.82)] p-4 shadow-[0_24px_80px_rgba(5,8,18,0.55)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-wrap items-center gap-2">
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
        <Button variant="secondary" onClick={onSyncCalendar} disabled={isSyncing}>
          {isSyncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Sync calendar
        </Button>
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
