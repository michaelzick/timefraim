import { Link } from "react-router-dom";
import {
  formatFullDate,
  formatWeekdayLabel,
  getDayOfMonth,
  getMonthGridDays,
  isSameCalendarMonth,
} from "@/features/calendar/calendar-dates";
import { CalendarDropZone } from "@/features/calendar/calendar-drop-zone";
import type { CalendarEntry } from "@/features/calendar/calendar-entries";
import { CalendarTaskChip } from "@/features/calendar/calendar-task-chip";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_CHIPS = 3;

function MonthCell({
  date,
  entries,
  isOutsideMonth,
  isToday,
  onShowWeek,
}: {
  date: string;
  entries: CalendarEntry[];
  isOutsideMonth: boolean;
  isToday: boolean;
  onShowWeek: (date: string) => void;
}) {
  const fullDate = formatFullDate(date);
  const hiddenCount = entries.length - MAX_VISIBLE_CHIPS;

  return (
    <CalendarDropZone
      id={`calendar-month-${date}`}
      date={date}
      label={fullDate}
      className={cn(
        "min-h-[128px] min-w-0 space-y-1 border-l border-t border-[var(--timeline-grid)] p-1.5",
        isOutsideMonth && "bg-[var(--panel-subtle)]",
      )}
    >
      <Link
        to={`/?date=${date}`}
        aria-label={`Open ${fullDate} in the Planner`}
        aria-current={isToday ? "date" : undefined}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition hover:bg-[var(--panel-hover)]",
          isOutsideMonth ? "text-[var(--muted)]" : "text-[var(--heading)]",
          isToday && "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]",
        )}
      >
        {getDayOfMonth(date)}
      </Link>
      {entries.slice(0, MAX_VISIBLE_CHIPS).map((entry) => (
        <CalendarTaskChip key={entry.task.id} entry={entry} />
      ))}
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="w-full cursor-pointer rounded-lg px-1.5 text-left text-[11px] font-medium text-[var(--muted-strong)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--heading)]"
          onClick={() => onShowWeek(date)}
        >
          +{hiddenCount} more
        </button>
      ) : null}
    </CalendarDropZone>
  );
}

export function CalendarMonthView({
  anchor,
  entriesByDate,
  today,
  onShowWeek,
}: {
  anchor: string;
  entriesByDate: Map<string, CalendarEntry[]>;
  today: string;
  onShowWeek: (date: string) => void;
}) {
  const days = getMonthGridDays(anchor);

  return (
    <div className="overflow-x-auto rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-elevated)]">
      <div className="grid min-w-[640px] grid-cols-7 border-b border-r border-[var(--timeline-grid)]">
        {days.slice(0, 7).map((date) => (
          <div
            key={date}
            className="px-2 py-2 text-center text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]"
          >
            {formatWeekdayLabel(date)}
          </div>
        ))}
        {days.map((date) => (
          <MonthCell
            key={date}
            date={date}
            entries={entriesByDate.get(date) ?? []}
            isOutsideMonth={!isSameCalendarMonth(date, anchor)}
            isToday={date === today}
            onShowWeek={onShowWeek}
          />
        ))}
      </div>
    </div>
  );
}
