import { describe, expect, it } from "vitest";
import {
  apiErrorSchema,
  calendarEventViewSchema,
  calendarSyncQuerySchema,
  calendarSyncResultSchema,
  googleCalendarSettingsSchema,
  plannerMutationResultSchema,
  taskCategorySchema,
  taskInputSchema,
  taskSchema,
  taskUpdateSchema,
} from "./index.js";

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
        category: "personal",
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
        calendarSync: {
          status: "fully_synced",
          syncedAt: "2026-04-06T09:00:00.000Z",
          hiddenEventCount: 0,
        },
      }).date,
    ).toBe("2026-04-06");

    expect(
      calendarSyncQuerySchema.parse({
        date: "2026-04-06",
        restoreHidden: "true",
        tz: "-420",
      }).restoreHidden,
    ).toBe(true);

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

    expect(
      googleCalendarSettingsSchema.parse({
        availableCalendars: [],
        syncCalendarIds: ["primary"],
        syncPlannerBlocksToCalendar: false,
        plannerCalendarId: "planner",
      }).plannerSyncTarget,
    ).toBe("none");
  });

  it("keeps create defaults out of sparse task updates", () => {
    expect(taskInputSchema.parse({ title: "Deep work" })).toMatchObject({
      estimatedMinutes: 30,
      priority: "low",
      category: "personal",
      status: "planned",
    });

    expect(
      taskUpdateSchema.parse({
        taskId: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
      }),
    ).toEqual({
      taskId: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
    });

    expect(
      taskUpdateSchema.omit({ taskId: true }).parse({
        estimatedMinutes: 60,
      }),
    ).toEqual({ estimatedMinutes: 60 });
  });

  it("defaults task category to personal and accepts explicit work", () => {
    expect(taskInputSchema.parse({ title: "Personal errand" }).category).toBe("personal");
    expect(taskInputSchema.parse({ title: "Client review", category: "work" }).category).toBe("work");

    expect(
      taskUpdateSchema.omit({ taskId: true }).parse({ category: "work" }),
    ).toEqual({ category: "work" });
  });

  it("rejects invalid task categories", () => {
    expect(() => taskCategorySchema.parse("personal")).not.toThrow();
    expect(() => taskCategorySchema.parse("work")).not.toThrow();
    expect(() => taskCategorySchema.parse("none")).toThrow();
    expect(() => taskCategorySchema.parse("")).toThrow();
    expect(() => taskInputSchema.parse({ title: "x", category: "invalid" })).toThrow();
  });

  it("includes category in the parsed task schema", () => {
    const task = taskSchema.parse({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
      title: "Plan launch week",
      notes: null,
      estimatedMinutes: 45,
      status: "planned",
      priority: "medium",
      category: "work",
      scheduledBlockId: null,
      togglProjectId: null,
      createdAt: "2026-04-06T08:00:00.000Z",
      updatedAt: "2026-04-06T08:00:00.000Z",
    });
    expect(task.category).toBe("work");
  });
});
