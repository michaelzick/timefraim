import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import type { Task } from "@timefraim/shared";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { parseCalendarAnchor, parseCalendarView, stepCalendarAnchor, type CalendarView } from "@/features/calendar/calendar-dates";
import { readCalendarDate, readCalendarEntry } from "@/features/calendar/calendar-dnd";
import { groupCalendarEntries, type CalendarEntry } from "@/features/calendar/calendar-entries";
import { CalendarMonthView } from "@/features/calendar/calendar-month-view";
import { CalendarTaskChipPreview } from "@/features/calendar/calendar-task-chip";
import { CalendarToolbar } from "@/features/calendar/calendar-toolbar";
import { CalendarWeekView } from "@/features/calendar/calendar-week-view";
import { filterTasksByCategory, type TaskCategoryFilter } from "@/features/planner/planner-page-selection";
import { showActionError } from "@/features/planner/planner-page-utils";
import { runScheduleBlockMove } from "@/features/planner/schedule-block-move";
import type { PlannerPageProps } from "@/features/planner/types";
import { getTodayDate } from "@/lib/utils";

type CalendarPageProps = Pick<PlannerPageProps, "date" | "isMutating" | "onUpdateScheduleBlock"> & {
  tasks: Task[];
};

export function CalendarPage({ date, isMutating, onUpdateScheduleBlock, tasks }: CalendarPageProps) {
  // Not `date`: use-app-shell-data applies that param on every route and changes the global date.
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseCalendarView(searchParams.get("view"));
  const anchor = parseCalendarAnchor(searchParams.get("anchor"), date);
  const today = getTodayDate();
  const [categoryFilter, setCategoryFilter] = useState<TaskCategoryFilter>("all");
  const [activeEntry, setActiveEntry] = useState<CalendarEntry | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const entriesByDate = useMemo(
    () => groupCalendarEntries(filterTasksByCategory(tasks, categoryFilter)),
    [tasks, categoryFilter],
  );

  const showCalendar = (nextView: CalendarView, nextAnchor: string) => {
    setSearchParams({ view: nextView, anchor: nextAnchor }, { replace: true });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveEntry(readCalendarEntry(event.active.data.current));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEntry(null);
    const entry = readCalendarEntry(event.active.data.current);
    const targetDate = readCalendarDate(event.over?.data.current);
    if (!entry?.blockId || !entry.startAt || !entry.endAt || !targetDate) {
      return;
    }

    void runScheduleBlockMove({
      block: { id: entry.blockId, startAt: entry.startAt, endAt: entry.endAt },
      targetDate,
      // The full list: a task hidden by the category filter still occupies its time.
      tasks,
      onUpdateScheduleBlock,
    }).catch((error) => showActionError("Failed to move the task. Please try again.", error));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveEntry(null)}
    >
      <div className="space-y-6" aria-busy={isMutating}>
        <CalendarToolbar
          anchor={anchor}
          view={view}
          isToday={anchor === today}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          onStep={(direction) => showCalendar(view, stepCalendarAnchor(anchor, view, direction))}
          onToday={() => showCalendar(view, today)}
          onViewChange={(nextView) => showCalendar(nextView, anchor)}
        />
        {view === "month" ? (
          <CalendarMonthView
            anchor={anchor}
            entriesByDate={entriesByDate}
            today={today}
            onShowWeek={(nextAnchor) => showCalendar("week", nextAnchor)}
          />
        ) : (
          <CalendarWeekView anchor={anchor} entriesByDate={entriesByDate} today={today} />
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeEntry ? <CalendarTaskChipPreview entry={activeEntry} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
