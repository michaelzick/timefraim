import { describe, expect, it } from "vitest";
import { getTaskScheduleLabel } from "@/features/kanban/kanban-schedule-label";
import { buildTask } from "@/test/fixtures";

describe("kanban-schedule-label", () => {
  it("uses joined schedule metadata so Kanban cards show the scheduled date", () => {
    const task = buildTask({
      scheduledBlockId: "block-1f8f9660-0000-4000-8000-000000000001",
      scheduledStartAt: "2026-04-08T16:00:00.000Z",
      scheduledEndAt: "2026-04-08T16:45:00.000Z",
    });

    expect(getTaskScheduleLabel(task, [])).toMatch(/^Apr 8, /);
  });

  it("falls back to the visible day schedule block when joined metadata is absent", () => {
    const task = buildTask({ scheduledBlockId: "block-1f8f9660-0000-4000-8000-000000000001" });

    expect(
      getTaskScheduleLabel(task, [
        {
          id: task.scheduledBlockId!,
          taskId: task.id,
          startAt: "2026-04-09T16:00:00.000Z",
          endAt: "2026-04-09T16:45:00.000Z",
          source: "manual",
          state: "confirmed",
          googleEventId: null,
          googleTaskId: null,
          createdAt: "2026-04-08T16:00:00.000Z",
          updatedAt: "2026-04-08T16:00:00.000Z",
        },
      ]),
    ).toMatch(/^Apr 9, /);
  });
});
