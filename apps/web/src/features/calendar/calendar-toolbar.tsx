import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryFilterControl } from "@/components/category-filter-control";
import { Button } from "@/components/ui/button";
import { formatCalendarTitle, type CalendarView } from "@/features/calendar/calendar-dates";
import type { TaskCategoryFilter } from "@/features/planner/planner-page-selection";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
];

export function CalendarToolbar({
  anchor,
  view,
  isToday,
  categoryFilter,
  onCategoryFilterChange,
  onStep,
  onToday,
  onViewChange,
}: {
  anchor: string;
  view: CalendarView;
  isToday: boolean;
  categoryFilter: TaskCategoryFilter;
  onCategoryFilterChange: (value: TaskCategoryFilter) => void;
  onStep: (direction: 1 | -1) => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
}) {
  return (
    <section
      aria-label="Calendar toolbar"
      className="flex flex-col gap-3 rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-elevated)] p-4 shadow-[var(--shadow-elevated)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={isToday} onClick={onToday}>
          Today
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Previous ${view}`}
          className="h-10 w-10 p-0"
          onClick={() => onStep(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Next ${view}`}
          className="h-10 w-10 p-0"
          onClick={() => onStep(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="ml-1 text-xl font-semibold text-[var(--heading)]">{formatCalendarTitle(anchor, view)}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CategoryFilterControl
          value={categoryFilter}
          onChange={onCategoryFilterChange}
          ariaLabel="Filter calendar by category"
        />
        <div
          role="group"
          aria-label="Calendar view"
          className="inline-flex items-center gap-1 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-1"
        >
          {VIEW_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={view === option.value}
              className={cn(
                "h-8 px-3 text-xs",
                view === option.value
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft-strong)] hover:text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]",
              )}
              onClick={() => onViewChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
