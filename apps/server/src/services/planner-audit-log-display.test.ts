import type { AuditLog, CalendarEventView, ScheduleBlock, Task } from "@timefraim/shared";
import { describe, expect, it } from "vitest";
import { resolveAuditLogDisplaySummaries } from "./planner-audit-log-display.js";

const task: Task = {
  id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
  title: "Journal",
  notes: null,
  estimatedMinutes: 30,
  status: "planned",
  priority: "medium",
  scheduledBlockId: null,
  togglProjectId: null,
  createdAt: "2026-04-20T08:00:00.000Z",
  updatedAt: "2026-04-20T08:00:00.000Z",
};

const scheduleBlock: ScheduleBlock = {
  id: "3f441c84-f3c7-4f40-8e88-8f2a6520f528",
  taskId: task.id,
  startAt: "2026-04-20T09:00:00.000Z",
  endAt: "2026-04-20T09:30:00.000Z",
  source: "manual",
  state: "confirmed",
  googleEventId: null,
  createdAt: "2026-04-20T08:00:00.000Z",
  updatedAt: "2026-04-20T08:00:00.000Z",
};

const calendarEvent: CalendarEventView = {
  id: "970c02c6-d0e2-491d-a386-4d447b6dce7a",
  externalEventId: "google-1",
  title: "Focus block",
  startAt: "2026-04-20T11:00:00.000Z",
  endAt: "2026-04-20T12:00:00.000Z",
  isAppManaged: false,
  backgroundColor: null,
  foregroundColor: null,
  sourceCalendarId: null,
  sourceCalendarName: null,
  togglProjectId: null,
};

function buildAuditLog(overrides: Partial<AuditLog>): AuditLog {
  return {
    id: "d56cc8c3-58c0-4629-bc6a-e0b0a73c1c0c",
    actorRole: "user",
    action: "task.update",
    entityType: "task",
    entityId: task.id,
    diffSummary: "Update task 84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
    displaySummary: "Update task 84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
    payload: {},
    createdAt: "2026-04-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("resolveAuditLogDisplaySummaries", () => {
  it("prefers title snapshots and live lookups over raw ids", () => {
    const auditLogs = [
      buildAuditLog({
        action: "timer.start",
        entityType: "timer_session",
        entityId: "9ab774ee-0b28-4dc3-b829-4f55b74af0f7",
        diffSummary: `Start timer for task ${task.id}`,
        payload: { taskId: task.id, taskTitle: "Journal" },
      }),
      buildAuditLog({
        action: "schedule_block.delete",
        entityType: "schedule_block",
        entityId: scheduleBlock.id,
        diffSummary: `Remove schedule block ${scheduleBlock.id}`,
        payload: { scheduleBlockId: scheduleBlock.id, taskTitle: "Deep work" },
      }),
      buildAuditLog({
        action: "calendar_event.dismiss",
        entityType: "calendar_event",
        entityId: calendarEvent.id,
        diffSummary: `Hide calendar event ${calendarEvent.id}`,
        payload: { calendarEventId: calendarEvent.id },
      }),
    ];

    expect(
      resolveAuditLogDisplaySummaries(auditLogs, {
        tasks: [task],
        scheduleBlocks: [scheduleBlock],
        calendarEvents: [calendarEvent],
      }).map((auditLog) => auditLog.displaySummary),
    ).toEqual([
      'Start timer for task "Journal"',
      'Remove scheduled task "Deep work"',
      'Hide calendar event "Focus block"',
    ]);
  });

  it("falls back to diffSummary when no title can be resolved", () => {
    const auditLog = buildAuditLog({
      action: "schedule_block.delete",
      entityType: "schedule_block",
      entityId: scheduleBlock.id,
      diffSummary: `Remove schedule block ${scheduleBlock.id}`,
      payload: { scheduleBlockId: scheduleBlock.id },
    });

    expect(
      resolveAuditLogDisplaySummaries([auditLog], {
        tasks: [],
        scheduleBlocks: [],
        calendarEvents: [],
      })[0]?.displaySummary,
    ).toBe(`Remove schedule block ${scheduleBlock.id}`);
  });
});
