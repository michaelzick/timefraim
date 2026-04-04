import { describe, expect, it } from "vitest";
import type { CalendarEventView, ScheduleBlock, Task, TimerSession } from "@schejewel/shared";
import {
  buildGoogleEventPayload,
  detectScheduleConflicts,
  finalizeTimerSession,
  resolveIdleTaskStatus,
} from "./planner-domain.js";

describe("planner-domain", () => {
  it("detects overlaps against external calendar events", () => {
    const conflicts = detectScheduleConflicts({
      candidateStartAt: "2026-04-04T10:00:00.000Z",
      candidateEndAt: "2026-04-04T11:00:00.000Z",
      scheduleBlocks: [],
      calendarEvents: [
        {
          id: "standup",
          title: "Standup",
          startAt: "2026-04-04T10:30:00.000Z",
          endAt: "2026-04-04T11:00:00.000Z",
          isAppManaged: false,
        } satisfies CalendarEventView,
      ],
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.title).toBe("Standup");
  });

  it("builds Google event payloads with stable private metadata", () => {
    const task: Task = {
      id: "b8e05d80-1e2b-4a81-b6b8-3af64f5ec794",
      title: "Deep work",
      notes: "Protect this block.",
      estimatedMinutes: 90,
      status: "scheduled",
      scheduledBlockId: "acfd1905-9bdb-4326-b5c4-a84d4139f814",
      togglProjectId: null,
      createdAt: "2026-04-04T08:00:00.000Z",
      updatedAt: "2026-04-04T08:00:00.000Z",
    };
    const block: ScheduleBlock = {
      id: "acfd1905-9bdb-4326-b5c4-a84d4139f814",
      taskId: task.id,
      startAt: "2026-04-04T13:00:00.000Z",
      endAt: "2026-04-04T14:30:00.000Z",
      source: "manual",
      state: "confirmed",
      googleEventId: null,
      createdAt: "2026-04-04T08:00:00.000Z",
      updatedAt: "2026-04-04T08:00:00.000Z",
    };

    const payload = buildGoogleEventPayload(task, block);

    expect(payload.summary).toBe("Deep work");
    expect(payload.extendedProperties.private.scheduleBlockId).toBe(block.id);
  });

  it("finalizes timer sessions and restores idle task status", () => {
    const timer: TimerSession = {
      id: "20cf69ec-4b36-4ff4-af56-2024b56d40ff",
      taskId: "b8e05d80-1e2b-4a81-b6b8-3af64f5ec794",
      togglEntryId: null,
      startedAt: "2026-04-04T09:00:00.000Z",
      endedAt: null,
      durationSeconds: null,
      source: "manual",
    };
    const finished = finalizeTimerSession(timer, "2026-04-04T09:25:00.000Z");

    expect(finished.durationSeconds).toBe(1500);
    expect(
      resolveIdleTaskStatus({
        id: timer.taskId,
        title: "Timer task",
        notes: null,
        estimatedMinutes: 25,
        status: "in_progress",
        scheduledBlockId: null,
        togglProjectId: null,
        createdAt: "2026-04-04T08:00:00.000Z",
        updatedAt: "2026-04-04T08:00:00.000Z",
      }),
    ).toBe("planned");
  });
});
