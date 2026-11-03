import { describe, expect, it } from "vitest";
import { getCalendarEntry, groupCalendarEntries } from "@/features/calendar/calendar-entries";
import { buildTask } from "@/test/fixtures";

function localIso(value: string) {
  return new Date(value).toISOString();
}

function scheduledTask(id: string, title: string, start: string, end: string) {
  return buildTask({
    id,
    title,
    status: "scheduled",
    scheduledBlockId: `block-${id}`,
    scheduledStartAt: localIso(start),
    scheduledEndAt: localIso(end),
  });
}

describe("getCalendarEntry", () => {
  it("dates a scheduled task by the local day of its block", () => {
    const entry = getCalendarEntry(scheduledTask("a", "Late", "2026-11-05T23:30:00", "2026-11-05T23:45:00"));

    expect(entry?.date).toBe("2026-11-05");
    expect(entry?.blockId).toBe("block-a");
  });

  it("prefers the block's date for a done task that's still scheduled", () => {
    const entry = getCalendarEntry({
      ...scheduledTask("a", "Done", "2026-11-05T09:00:00", "2026-11-05T10:00:00"),
      status: "done",
      completedOnDate: "2026-11-09",
    });

    expect(entry?.date).toBe("2026-11-05");
    expect(entry?.blockId).toBe("block-a");
  });

  it("dates a done task with no block by its completion date, with no time", () => {
    const entry = getCalendarEntry(buildTask({ status: "done", completedOnDate: "2026-11-09" }));

    expect(entry).toMatchObject({ date: "2026-11-09", blockId: null, startAt: null, endAt: null });
  });

  it.each([
    ["inbox", buildTask({ status: "inbox" })],
    ["planned", buildTask({ status: "planned" })],
    ["done with no completion date", buildTask({ status: "done", completedOnDate: null })],
  ])("leaves out a task that's %s", (_label, task) => {
    expect(getCalendarEntry(task)).toBeNull();
  });
});

describe("groupCalendarEntries", () => {
  it("groups by date and sorts by start time with untimed tasks last", () => {
    const entries = groupCalendarEntries([
      scheduledTask("late", "Late", "2026-11-05T15:00:00", "2026-11-05T16:00:00"),
      buildTask({ id: "done-b", title: "Done B", status: "done", completedOnDate: "2026-11-05" }),
      scheduledTask("early", "Early", "2026-11-05T09:00:00", "2026-11-05T10:00:00"),
      buildTask({ id: "done-a", title: "Done A", status: "done", completedOnDate: "2026-11-05" }),
      scheduledTask("other", "Other day", "2026-11-06T09:00:00", "2026-11-06T10:00:00"),
      buildTask({ id: "queue", title: "Queue only" }),
    ]);

    expect(entries.get("2026-11-05")?.map((entry) => entry.task.title)).toEqual([
      "Early",
      "Late",
      "Done A",
      "Done B",
    ]);
    expect(entries.get("2026-11-06")?.map((entry) => entry.task.title)).toEqual(["Other day"]);
    expect(entries.size).toBe(2);
  });
});
