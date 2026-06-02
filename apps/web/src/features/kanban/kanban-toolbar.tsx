import { CalendarDays, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type KanbanToolbarProps = {
  date: string;
  doneCount: number;
  search: string;
  scheduledTodayCount: number;
  taskCount: number;
  onDateChange: (nextDate: string) => void;
  onSearchChange: (value: string) => void;
};

export function KanbanToolbar({
  date,
  doneCount,
  search,
  scheduledTodayCount,
  taskCount,
  onDateChange,
  onSearchChange,
}: KanbanToolbarProps) {
  return (
    <section className="rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-elevated)] p-5 shadow-[var(--shadow-elevated)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge>Task scheduler</Badge>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--heading)]">Board</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--muted-strong)]">
            <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
            <span className="sr-only">Board date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className="bg-transparent text-[var(--heading)] outline-none"
            />
          </label>
          <div className="relative sm:w-[280px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            />
            <Input
              aria-label="Search board tasks"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search board"
              className="pl-10"
            />
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge>{taskCount} tasks</Badge>
        <Badge>{scheduledTodayCount} scheduled today</Badge>
        <Badge>{doneCount} done</Badge>
      </div>
    </section>
  );
}
