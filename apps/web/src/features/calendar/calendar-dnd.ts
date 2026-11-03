import type { CalendarEntry } from "@/features/calendar/calendar-entries";

export const CALENDAR_DRAG_TYPE = "calendar-task";

export function readCalendarEntry(data: unknown): CalendarEntry | null {
  if (!data || typeof data !== "object" || !("dragType" in data) || data.dragType !== CALENDAR_DRAG_TYPE) {
    return null;
  }
  return "entry" in data ? (data.entry as CalendarEntry) : null;
}

export function readCalendarDate(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("calendarDate" in data)) {
    return null;
  }
  return typeof data.calendarDate === "string" ? data.calendarDate : null;
}
