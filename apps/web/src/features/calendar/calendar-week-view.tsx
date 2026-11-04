import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  END_HOUR_EXCLUSIVE,
  getTimelineContainerHeight,
  getTimelinePlacement,
  isShortBlock,
  SLOT_HEIGHT,
  START_HOUR,
} from "@/components/timeline-geometry";
import { formatFullDate, formatWeekdayLabel, getDayOfMonth, getWeekDays } from "@/features/calendar/calendar-dates";
import { CalendarDropZone } from "@/features/calendar/calendar-drop-zone";
import type { CalendarEntry } from "@/features/calendar/calendar-entries";
import { CalendarTaskChip } from "@/features/calendar/calendar-task-chip";
import { cn } from "@/lib/utils";

// Half the Planner timeline's scale, so about ten hours fit on screen at once.
const WEEK_SCALE = 0.5;
const HOUR_HEIGHT = SLOT_HEIGHT * 4 * WEEK_SCALE;
const MIN_CHIP_HEIGHT = 18;
const GRID_COLUMNS = "grid-cols-[52px_repeat(7,minmax(0,1fr))]";
const HOURS = Array.from({ length: END_HOUR_EXCLUSIVE - START_HOUR }, (_, index) => START_HOUR + index);

function formatHourLabel(hour: number) {
  return `${((hour + 11) % 12) + 1} ${hour < 12 ? "AM" : "PM"}`;
}

function getWeekPlacement(entry: CalendarEntry) {
  return entry.startAt && entry.endAt ? getTimelinePlacement(entry.date, entry.startAt, entry.endAt) : null;
}

function WeekDayColumn({ date, entries }: { date: string; entries: CalendarEntry[] }) {
  return (
    <CalendarDropZone
      id={`calendar-week-${date}`}
      date={date}
      label={`${formatFullDate(date)} schedule`}
      className="relative min-w-0 border-l border-[var(--timeline-grid)]"
    >
      {HOURS.map((hour, index) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-[var(--timeline-grid)]"
          style={{ top: index * HOUR_HEIGHT }}
        />
      ))}
      {entries.map((entry) => {
        const placement = getWeekPlacement(entry);
        if (!placement || !entry.startAt || !entry.endAt) return null;
        return (
          <CalendarTaskChip
            key={entry.task.id}
            entry={entry}
            layout={isShortBlock(entry.startAt, entry.endAt) ? "inline" : "stacked"}
            className="absolute left-0.5 right-0.5 w-auto"
            style={{
              top: placement.top * WEEK_SCALE,
              height: Math.max(placement.height * WEEK_SCALE, MIN_CHIP_HEIGHT),
            }}
          />
        );
      })}
    </CalendarDropZone>
  );
}

export function CalendarWeekView({
  anchor,
  entriesByDate,
  today,
}: {
  anchor: string;
  entriesByDate: Map<string, CalendarEntry[]>;
  today: string;
}) {
  const days = getWeekDays(anchor);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridHeight = getTimelineContainerHeight() * WEEK_SCALE;

  useEffect(() => {
    if (!scrollRef.current) return;
    const firstVisibleHour = Math.max(START_HOUR, new Date().getHours() - 1);
    scrollRef.current.scrollTop = (firstVisibleHour - START_HOUR) * HOUR_HEIGHT;
  }, []);

  return (
    // One scroll container for the header and grid, so a scrollbar narrows them equally and their lines stay aligned.
    <div
      ref={scrollRef}
      className="max-h-[80vh] overflow-auto rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-elevated)]"
    >
      <div className="min-w-[720px]">
        <div className="sticky top-0 z-10 bg-[var(--panel)]">
          <div className={cn("grid border-b border-[var(--timeline-grid)]", GRID_COLUMNS)}>
            <div />
            {days.map((date) => (
              <div key={date} className="flex flex-col items-center gap-1 border-l border-[var(--timeline-grid)] py-2">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                  {formatWeekdayLabel(date)}
                </span>
                <Link
                  to={`/?date=${date}`}
                  aria-label={`Open ${formatFullDate(date)} in the Planner`}
                  aria-current={date === today ? "date" : undefined}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-[var(--heading)] transition hover:bg-[var(--panel-hover)]",
                    date === today && "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]",
                  )}
                >
                  {getDayOfMonth(date)}
                </Link>
              </div>
            ))}
          </div>
          {/* Done tasks with no time, and blocks outside the hour grid, so nothing is hidden. */}
          <div className={cn("grid border-b border-[var(--timeline-grid)]", GRID_COLUMNS)}>
            <div />
            {days.map((date) => (
              <CalendarDropZone
                key={date}
                id={`calendar-week-top-${date}`}
                date={date}
                label={`${formatFullDate(date)} tasks without a slot`}
                className="min-h-7 min-w-0 space-y-1 border-l border-[var(--timeline-grid)] p-1"
              >
                {(entriesByDate.get(date) ?? [])
                  .filter((entry) => !getWeekPlacement(entry))
                  .map((entry) => (
                    <CalendarTaskChip key={entry.task.id} entry={entry} />
                  ))}
              </CalendarDropZone>
            ))}
          </div>
        </div>
        <div className={cn("grid", GRID_COLUMNS)} style={{ height: gridHeight }}>
          <div className="relative">
            {HOURS.map((hour, index) => (
              <span
                key={hour}
                className="absolute right-2 text-[10px] font-medium text-[var(--muted)]"
                style={{ top: index * HOUR_HEIGHT + 2 }}
              >
                {formatHourLabel(hour)}
              </span>
            ))}
          </div>
          {days.map((date) => (
            <WeekDayColumn key={date} date={date} entries={entriesByDate.get(date) ?? []} />
          ))}
        </div>
      </div>
    </div>
  );
}
