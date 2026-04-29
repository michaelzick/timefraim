import { describe, expect, it } from "vitest";
import { apiErrorSchema, calendarEventViewSchema, calendarSyncResultSchema, googleCalendarSettingsSchema, plannerMutationResultSchema, taskSchema } from "./index.js";

describe("shared barrel exports", () => {
  it("exposes core schemas through the package root", () => {
    expect(
      taskSchema.parse({
        id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
        title: "Plan launch week",
        notes: null,
        estimatedMinutes: 45,
        status: "planned",
        priority: "medium",
        scheduledBlockId: null,
        togglProjectId: null,
        createdAt: "2026-04-06T08:00:00.000Z",
        updatedAt: "2026-04-06T08:00:00.000Z",
      }).title,
    ).toBe("Plan launch week");

    expect(
      apiErrorSchema.parse({
        code: "invalid_input",
        message: "Invalid request",
        requestId: "req-1",
      }).code,
    ).toBe("invalid_input");

    expect(
      plannerMutationResultSchema.parse({
        status: "applied",
        kind: "task.create",
        diffSummary: "Create task",
      }).status,
    ).toBe("applied");

    expect(
      calendarSyncResultSchema.parse({
        date: "2026-04-06",
        events: [],
      }).date,
    ).toBe("2026-04-06");

    expect(
      calendarEventViewSchema.parse({
        id: "calendar-1",
        externalEventId: "google-1",
        title: "Team sync",
        startAt: "2026-04-06T15:00:00.000Z",
        endAt: "2026-04-06T15:30:00.000Z",
        isAppManaged: false,
        backgroundColor: "#d50000",
        foregroundColor: null,
      }).backgroundColor,
    ).toBe("#d50000");

    expect(
      googleCalendarSettingsSchema.parse({
        availableCalendars: [],
        syncCalendarIds: ["primary"],
        plannerCalendarId: "planner",
      }).syncPlannerBlocksToCalendar,
    ).toBe(true);
  });
});
