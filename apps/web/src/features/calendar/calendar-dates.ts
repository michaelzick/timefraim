import { stepLocalDate } from "@timefraim/shared";

export type CalendarView = "month" | "week";

const DAYS_IN_WEEK = 7;
const MONTH_GRID_DAYS = 42;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toLocalNoon(date: string) {
  return new Date(`${date}T12:00:00`);
}

function buildDays(firstDay: string, count: number) {
  return Array.from({ length: count }, (_, index) => stepLocalDate(firstDay, index));
}

function format(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", options).format(toLocalNoon(date));
}

export function getWeekDays(anchor: string) {
  return buildDays(stepLocalDate(anchor, -toLocalNoon(anchor).getDay()), DAYS_IN_WEEK);
}

export function getMonthGridDays(anchor: string) {
  const firstOfMonth = `${anchor.slice(0, 7)}-01`;
  return buildDays(stepLocalDate(firstOfMonth, -toLocalNoon(firstOfMonth).getDay()), MONTH_GRID_DAYS);
}

export function stepCalendarAnchor(anchor: string, view: CalendarView, direction: 1 | -1) {
  if (view === "week") {
    return stepLocalDate(anchor, direction * DAYS_IN_WEEK);
  }

  const [year, month, day] = anchor.split("-").map(Number);
  const firstOfTarget = new Date(year, month - 1 + direction, 1);
  const targetYear = firstOfTarget.getFullYear();
  const targetMonth = firstOfTarget.getMonth();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();

  return [
    targetYear,
    String(targetMonth + 1).padStart(2, "0"),
    String(Math.min(day, lastDay)).padStart(2, "0"),
  ].join("-");
}

export function isSameCalendarMonth(left: string, right: string) {
  return left.slice(0, 7) === right.slice(0, 7);
}

export function getDayOfMonth(date: string) {
  return Number(date.slice(8));
}

export function formatWeekdayLabel(date: string) {
  return format(date, { weekday: "short" });
}

export function formatFullDate(date: string) {
  return format(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatCalendarTitle(anchor: string, view: CalendarView) {
  if (view === "month") {
    return format(anchor, { month: "long", year: "numeric" });
  }

  const days = getWeekDays(anchor);
  const first = days[0];
  const last = days[days.length - 1];
  const firstLabel = format(first, { month: "short", day: "numeric" });
  const year = last.slice(0, 4);
  if (first.slice(0, 4) !== year) {
    return `${firstLabel}, ${first.slice(0, 4)} – ${format(last, { month: "short", day: "numeric" })}, ${year}`;
  }
  const lastLabel = isSameCalendarMonth(first, last)
    ? String(getDayOfMonth(last))
    : format(last, { month: "short", day: "numeric" });
  return `${firstLabel} – ${lastLabel}, ${year}`;
}

export function parseCalendarView(value: string | null): CalendarView {
  return value === "week" ? "week" : "month";
}

export function parseCalendarAnchor(value: string | null, fallback: string) {
  // stepLocalDate normalizes impossible dates, so 2026-02-31 fails the round trip.
  return value && DATE_PATTERN.test(value) && stepLocalDate(value, 0) === value ? value : fallback;
}
