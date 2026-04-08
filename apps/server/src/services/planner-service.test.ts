import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleBlock, Task } from "@timefraim/shared";

const {
  fakeDb,
  deleteGoogleScheduleBlock,
  startTogglTimer,
  stopTogglTimer,
  syncGoogleCalendarWindow,
  upsertGoogleScheduleBlock,
} = vi.hoisted(() => ({
  fakeDb: { query: vi.fn() },
  deleteGoogleScheduleBlock: vi.fn(),
  syncGoogleCalendarWindow: vi.fn(),
  upsertGoogleScheduleBlock: vi.fn(),
  startTogglTimer: vi.fn(),
  stopTogglTimer: vi.fn(),
}));

vi.mock("../db/pool.js", () => ({
  pool: fakeDb,
  withTransaction: async (callback: (client: typeof fakeDb) => Promise<unknown>) => callback(fakeDb),
}));

vi.mock("../integration/google-calendar.js", () => ({
  deleteGoogleScheduleBlock,
  syncGoogleCalendarWindow,
  upsertGoogleScheduleBlock,
}));

vi.mock("../integration/toggl-track.js", () => ({
  startTogglTimer,
  stopTogglTimer,
}));

import { PlannerService } from "./planner-service.js";

const baseTask: Task = {
  id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
  title: "Plan launch week",
  notes: "Outline the week and protect deep-work blocks.",
  estimatedMinutes: 45,
  status: "scheduled",
  scheduledBlockId: "3f441c84-f3c7-4f40-8e88-8f2a6520f528",
  togglProjectId: null,
  createdAt: "2026-04-06T08:00:00.000Z",
  updatedAt: "2026-04-06T08:00:00.000Z",
};

const baseBlock: ScheduleBlock = {
  id: "3f441c84-f3c7-4f40-8e88-8f2a6520f528",
  taskId: baseTask.id,
  startAt: "2026-04-06T17:00:00.000Z",
  endAt: "2026-04-06T17:45:00.000Z",
  source: "manual",
  state: "synced",
  googleEventId: "google-event-123",
  createdAt: "2026-04-06T08:00:00.000Z",
  updatedAt: "2026-04-06T08:00:00.000Z",
};

function createDraft(kind: string, payload: Record<string, unknown>) {
  return {
    id: "draft-1",
    kind,
    payload,
    diffSummary: `Apply ${kind}`,
    status: "pending",
    actorRole: "user",
    expiresAt: "2026-04-07T00:00:00.000Z",
    createdAt: "2026-04-06T09:00:00.000Z",
    appliedAt: null,
    rejectedAt: null,
  };
}

function createRepositoryMock() {
  return {
    attachTogglEntry: vi.fn(),
    createAuditLog: vi.fn(),
    createDraft: vi.fn(),
    createScheduleBlock: vi.fn(),
    createTask: vi.fn(),
    createTimerSession: vi.fn(),
    deleteCalendarEventByScheduleBlockId: vi.fn(),
    deleteScheduleBlock: vi.fn(),
    deleteTask: vi.fn(),
    dismissCalendarEvent: vi.fn(),
    getActiveTimer: vi.fn(),
    getCalendarEvent: vi.fn(),
    getCalendarEventByExternalEventId: vi.fn(),
    getDraft: vi.fn(),
    getIntegrationStatus: vi.fn(),
    getIntegrationToken: vi.fn(),
    getScheduleBlock: vi.fn(),
    getScheduleBlockByTaskId: vi.fn(),
    getTask: vi.fn(),
    listCalendarEventsForRange: vi.fn(),
    listDrafts: vi.fn(),
    listIntegrationTokens: vi.fn(),
    listRecentAuditLogs: vi.fn(),
    listScheduleBlocksForRange: vi.fn(),
    listTasks: vi.fn(),
    stopTimer: vi.fn(),
    updateDraftStatus: vi.fn(),
    updateScheduleBlock: vi.fn(),
    updateTask: vi.fn(),
    upsertCalendarEvent: vi.fn(),
    upsertIntegrationToken: vi.fn(),
  };
}

describe("planner-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertGoogleScheduleBlock.mockResolvedValue(null);
    startTogglTimer.mockResolvedValue({ togglEntryId: null });
  });

  it("rejects a second schedule block for the same task", async () => {
    const repository = createRepositoryMock();
    repository.getIntegrationToken.mockResolvedValue(null);
    repository.getDraft.mockResolvedValue(
      createDraft("schedule_block.create", {
        taskId: baseTask.id,
        startAt: "2026-04-06T18:00:00.000Z",
        endAt: "2026-04-06T18:45:00.000Z",
        source: "manual",
      }),
    );
    repository.getTask.mockResolvedValue(baseTask);
    repository.getScheduleBlock.mockResolvedValue(baseBlock);

    const service = new PlannerService(repository as never);

    await expect(service.confirmDraft("draft-1", "user")).rejects.toThrow("Task is already scheduled");
    expect(repository.createScheduleBlock).not.toHaveBeenCalled();
  });

  it("deletes a scheduled task and triggers Google cleanup", async () => {
    const repository = createRepositoryMock();
    repository.getIntegrationToken.mockImplementation(async (provider: string) =>
      provider === "google"
        ? {
            provider: "google",
            access_token: "google-token",
            refresh_token: null,
            expires_at: null,
            metadata: {
              calendarId: "primary",
              email: "allowed@example.com",
            },
          }
        : null,
    );
    repository.getDraft.mockResolvedValue(createDraft("task.delete", { taskId: baseTask.id }));
    repository.getTask.mockResolvedValue(baseTask);
    repository.getScheduleBlock.mockResolvedValue(baseBlock);
    repository.getActiveTimer.mockResolvedValue(null);
    repository.deleteScheduleBlock.mockResolvedValue(baseBlock);
    repository.deleteTask.mockResolvedValue(baseTask);
    repository.updateDraftStatus.mockResolvedValue({
      ...createDraft("task.delete", { taskId: baseTask.id }),
      status: "applied",
      appliedAt: "2026-04-06T09:05:00.000Z",
    });

    const service = new PlannerService(repository as never);

    await service.confirmDraft("draft-1", "user");

    expect(repository.deleteCalendarEventByScheduleBlockId).toHaveBeenCalledWith(baseBlock.id, fakeDb);
    expect(repository.deleteScheduleBlock).toHaveBeenCalledWith(baseBlock.id, fakeDb);
    expect(repository.deleteTask).toHaveBeenCalledWith(baseTask.id, fakeDb);
    expect(deleteGoogleScheduleBlock).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "google-token", calendarId: "primary" }),
      baseBlock.googleEventId,
    );
  });

  it("applies direct user deletes without persisting a draft row", async () => {
    const repository = createRepositoryMock();
    repository.getIntegrationToken.mockImplementation(async (provider: string) =>
      provider === "google"
        ? {
            provider: "google",
            access_token: "google-token",
            refresh_token: null,
            expires_at: null,
            metadata: {
              calendarId: "primary",
              email: "allowed@example.com",
            },
          }
        : null,
    );
    repository.getTask.mockResolvedValue(baseTask);
    repository.getScheduleBlock.mockResolvedValue(baseBlock);
    repository.getActiveTimer.mockResolvedValue(null);
    repository.deleteScheduleBlock.mockResolvedValue(baseBlock);
    repository.deleteTask.mockResolvedValue(baseTask);

    const service = new PlannerService(repository as never);

    await service.applyChange("task.delete", { taskId: baseTask.id }, "user");

    expect(repository.createDraft).not.toHaveBeenCalled();
    expect(repository.updateDraftStatus).not.toHaveBeenCalled();
    expect(repository.deleteScheduleBlock).toHaveBeenCalledWith(baseBlock.id, fakeDb);
    expect(repository.deleteTask).toHaveBeenCalledWith(baseTask.id, fakeDb);
    expect(deleteGoogleScheduleBlock).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "google-token", calendarId: "primary" }),
      baseBlock.googleEventId,
    );
  });

  it("dismisses synced external calendar events locally", async () => {
    const repository = createRepositoryMock();
    repository.getIntegrationToken.mockResolvedValue(null);
    repository.getDraft.mockResolvedValue(
      createDraft("calendar_event.dismiss", { calendarEventId: "970c02c6-d0e2-491d-a386-4d447b6dce7a" }),
    );
    repository.getCalendarEvent.mockResolvedValue({
      id: "970c02c6-d0e2-491d-a386-4d447b6dce7a",
      externalEventId: "google-evt",
      title: "Investor breakfast",
      startAt: "2026-04-06T15:00:00.000Z",
      endAt: "2026-04-06T16:00:00.000Z",
      isAppManaged: false,
      scheduleBlockId: null,
      rawPayload: {},
      externalUpdatedAt: "2026-04-06T07:30:00.000Z",
      dismissedExternalUpdatedAt: null,
      createdAt: "2026-04-06T07:30:00.000Z",
      updatedAt: "2026-04-06T07:30:00.000Z",
    });
    repository.dismissCalendarEvent.mockResolvedValue({});
    repository.updateDraftStatus.mockResolvedValue({
      ...createDraft("calendar_event.dismiss", { calendarEventId: "970c02c6-d0e2-491d-a386-4d447b6dce7a" }),
      status: "applied",
      appliedAt: "2026-04-06T09:10:00.000Z",
    });

    const service = new PlannerService(repository as never);

    await service.confirmDraft("draft-1", "user");

    expect(repository.dismissCalendarEvent).toHaveBeenCalledWith(
      "970c02c6-d0e2-491d-a386-4d447b6dce7a",
      fakeDb,
    );
  });

  it("writes an app-managed mirror row when scheduling with Google sync enabled", async () => {
    const repository = createRepositoryMock();
    const unscheduledTask = {
      ...baseTask,
      status: "planned" as const,
      scheduledBlockId: null,
    };
    const draftPayload = {
      taskId: unscheduledTask.id,
      startAt: "2026-04-06T18:00:00.000Z",
      endAt: "2026-04-06T18:45:00.000Z",
      source: "manual",
    };
    const createdBlock = {
      ...baseBlock,
      taskId: unscheduledTask.id,
      startAt: draftPayload.startAt,
      endAt: draftPayload.endAt,
      state: "sync_pending" as const,
      googleEventId: null,
    };

    repository.getIntegrationToken.mockImplementation(async (provider: string) =>
      provider === "google"
        ? {
            provider: "google",
            access_token: "google-token",
            refresh_token: null,
            expires_at: null,
            metadata: {
              calendarId: "primary",
              email: "allowed@example.com",
            },
          }
        : null,
    );
    repository.getDraft.mockResolvedValue(createDraft("schedule_block.create", draftPayload));
    repository.getTask.mockResolvedValue(unscheduledTask);
    repository.getScheduleBlockByTaskId.mockResolvedValue(null);
    repository.listScheduleBlocksForRange.mockResolvedValue([]);
    repository.listCalendarEventsForRange.mockResolvedValue([]);
    repository.createScheduleBlock.mockResolvedValue(createdBlock);
    repository.updateTask.mockResolvedValue({
      ...unscheduledTask,
      scheduledBlockId: createdBlock.id,
      status: "scheduled",
    });
    repository.updateScheduleBlock.mockResolvedValue({
      ...createdBlock,
      googleEventId: "google-event-123",
      state: "synced",
    });
    repository.getScheduleBlock.mockResolvedValue(createdBlock);
    repository.upsertCalendarEvent.mockResolvedValue({
      id: "event-row-1",
      externalEventId: "google-event-123",
      title: unscheduledTask.title,
      startAt: createdBlock.startAt,
      endAt: createdBlock.endAt,
      isAppManaged: true,
      scheduleBlockId: createdBlock.id,
      rawPayload: { source: "timefraim", pendingSync: false },
      externalUpdatedAt: null,
      dismissedExternalUpdatedAt: null,
      createdAt: "2026-04-06T08:00:00.000Z",
      updatedAt: "2026-04-06T08:00:00.000Z",
    });
    repository.updateDraftStatus.mockResolvedValue({
      ...createDraft("schedule_block.create", draftPayload),
      status: "applied",
      appliedAt: "2026-04-06T09:10:00.000Z",
    });
    upsertGoogleScheduleBlock.mockResolvedValue("google-event-123");

    const service = new PlannerService(repository as never);

    await service.confirmDraft("draft-1", "user");

    expect(upsertGoogleScheduleBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({ accessToken: "google-token", calendarId: "primary" }),
        task: unscheduledTask,
        block: createdBlock,
      }),
    );
    expect(repository.upsertCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        externalEventId: "google-event-123",
        title: unscheduledTask.title,
        startAt: createdBlock.startAt,
        endAt: createdBlock.endAt,
        isAppManaged: true,
        scheduleBlockId: createdBlock.id,
        rawPayload: {
          source: "timefraim",
          pendingSync: false,
        },
      }),
      fakeDb,
    );
  });

  it("preserves dismissals for unchanged Google events and clears them when the event changes", async () => {
    const repository = createRepositoryMock();
    repository.getIntegrationToken.mockResolvedValue({
      provider: "google",
      access_token: "google-token",
      refresh_token: null,
      expires_at: null,
      metadata: {
        calendarId: "primary",
        email: "allowed@example.com",
      },
    });
    repository.listCalendarEventsForRange.mockResolvedValue([]);

    syncGoogleCalendarWindow
      .mockResolvedValueOnce([
        {
          externalEventId: "evt-1",
          title: "Investor breakfast",
          startAt: "2026-04-06T15:00:00.000Z",
          endAt: "2026-04-06T16:00:00.000Z",
          isAppManaged: false,
          rawPayload: {},
          scheduleBlockId: null,
          externalUpdatedAt: "2026-04-06T07:30:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          externalEventId: "evt-1",
          title: "Investor breakfast",
          startAt: "2026-04-06T15:00:00.000Z",
          endAt: "2026-04-06T16:30:00.000Z",
          isAppManaged: false,
          rawPayload: {},
          scheduleBlockId: null,
          externalUpdatedAt: "2026-04-06T08:45:00.000Z",
        },
      ]);
    repository.getCalendarEventByExternalEventId
      .mockResolvedValueOnce({
        id: "event-row-1",
        externalEventId: "evt-1",
        title: "Investor breakfast",
        startAt: "2026-04-06T15:00:00.000Z",
        endAt: "2026-04-06T16:00:00.000Z",
        isAppManaged: false,
        scheduleBlockId: null,
        rawPayload: {},
        externalUpdatedAt: "2026-04-06T07:30:00.000Z",
        dismissedExternalUpdatedAt: "2026-04-06T07:30:00.000Z",
        createdAt: "2026-04-06T07:30:00.000Z",
        updatedAt: "2026-04-06T07:30:00.000Z",
      })
      .mockResolvedValueOnce({
        id: "event-row-1",
        externalEventId: "evt-1",
        title: "Investor breakfast",
        startAt: "2026-04-06T15:00:00.000Z",
        endAt: "2026-04-06T16:00:00.000Z",
        isAppManaged: false,
        scheduleBlockId: null,
        rawPayload: {},
        externalUpdatedAt: "2026-04-06T07:30:00.000Z",
        dismissedExternalUpdatedAt: "2026-04-06T07:30:00.000Z",
        createdAt: "2026-04-06T07:30:00.000Z",
        updatedAt: "2026-04-06T07:30:00.000Z",
      });

    const service = new PlannerService(repository as never);

    await service.syncGoogleCalendar("2026-04-06", 0);
    await service.syncGoogleCalendar("2026-04-06", 0);

    expect(repository.upsertCalendarEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        externalEventId: "evt-1",
        dismissedExternalUpdatedAt: "2026-04-06T07:30:00.000Z",
      }),
      fakeDb,
    );
    expect(repository.upsertCalendarEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        externalEventId: "evt-1",
        dismissedExternalUpdatedAt: null,
      }),
      fakeDb,
    );
  });
});
