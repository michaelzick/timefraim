import { describe, expect, it } from "vitest";
import { calendarSyncResultSchema, plannerMutationResultSchema, taskSchema } from "./index.js";

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
  });
});
