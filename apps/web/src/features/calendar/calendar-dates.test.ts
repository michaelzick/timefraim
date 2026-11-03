import { describe, expect, it } from "vitest";
import {
  formatCalendarTitle,
  getMonthGridDays,
  getWeekDays,
  parseCalendarAnchor,
  parseCalendarView,
  stepCalendarAnchor,
} from "@/features/calendar/calendar-dates";

describe("getWeekDays", () => {
  it.each([
    ["a Sunday", "2026-11-01", "2026-11-01", "2026-11-07"],
    ["a midweek day", "2026-11-04", "2026-11-01", "2026-11-07"],
    ["a Saturday", "2026-11-07", "2026-11-01", "2026-11-07"],
    ["a week across months", "2026-12-01", "2026-11-29", "2026-12-05"],
    ["a week across years", "2026-12-31", "2026-12-27", "2027-01-02"],
    ["a week across the daylight saving change", "2026-03-08", "2026-03-08", "2026-03-14"],
  ])("for %s", (_label, anchor, first, last) => {
    const days = getWeekDays(anchor);

    expect(days).toHaveLength(7);
    expect(days[0]).toBe(first);
    expect(days[6]).toBe(last);
    expect(new Set(days).size).toBe(7);
  });
});

describe("getMonthGridDays", () => {
  it.each([
    ["a month starting on Sunday", "2026-11-15", "2026-11-01", "2026-12-12"],
    ["a month starting midweek", "2026-04-20", "2026-03-29", "2026-05-09"],
    ["a February", "2026-02-28", "2026-02-01", "2026-03-14"],
  ])("for %s", (_label, anchor, first, last) => {
    const days = getMonthGridDays(anchor);

    expect(days).toHaveLength(42);
    expect(days[0]).toBe(first);
    expect(days[41]).toBe(last);
    expect(new Set(days).size).toBe(42);
  });

  it("includes every day of the anchor month", () => {
    const days = getMonthGridDays("2026-01-15").filter((day) => day.startsWith("2026-01"));

    expect(days).toHaveLength(31);
  });
});

describe("stepCalendarAnchor", () => {
  it.each([
    ["week forward", "2026-11-03", "week", 1, "2026-11-10"],
    ["week back across a month", "2026-11-03", "week", -1, "2026-10-27"],
    ["month forward", "2026-11-15", "month", 1, "2026-12-15"],
    ["month forward across a year", "2026-12-15", "month", 1, "2027-01-15"],
    ["month back across a year", "2027-01-15", "month", -1, "2026-12-15"],
    ["clamping Jan 31 to February", "2026-01-31", "month", 1, "2026-02-28"],
    ["clamping into a leap February", "2028-01-31", "month", 1, "2028-02-29"],
    ["clamping Mar 31 back to February", "2026-03-31", "month", -1, "2026-02-28"],
  ] as const)("%s", (_label, anchor, view, direction, expected) => {
    expect(stepCalendarAnchor(anchor, view, direction)).toBe(expected);
  });
});

describe("formatCalendarTitle", () => {
  it.each([
    ["a month", "2026-11-15", "month", "November 2026"],
    ["a week in one month", "2026-11-04", "week", "Nov 1 – 7, 2026"],
    ["a week across months", "2026-12-01", "week", "Nov 29 – Dec 5, 2026"],
    ["a week across years", "2026-12-31", "week", "Dec 27, 2026 – Jan 2, 2027"],
  ] as const)("for %s", (_label, anchor, view, expected) => {
    expect(formatCalendarTitle(anchor, view)).toBe(expected);
  });
});

describe("parseCalendarView", () => {
  it.each([
    ["week", "week"],
    ["month", "month"],
    ["year", "month"],
    [null, "month"],
  ])("reads %s as %s", (value, expected) => {
    expect(parseCalendarView(value)).toBe(expected);
  });
});

describe("parseCalendarAnchor", () => {
  it.each([
    ["2026-11-03", "2026-11-03"],
    ["2028-02-29", "2028-02-29"],
    ["2026-02-31", "2026-04-06"],
    ["2026-13-01", "2026-04-06"],
    ["not-a-date", "2026-04-06"],
    [null, "2026-04-06"],
  ])("reads %s as %s", (value, expected) => {
    expect(parseCalendarAnchor(value, "2026-04-06")).toBe(expected);
  });
});
