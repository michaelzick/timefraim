import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleBlock, Task } from "@timefraim/shared";

const {
  deleteGoogleTask,
  fakeDb,
  deleteGoogleScheduleBlock,
  startTogglTimer,
  stopTogglTimer,
  syncGoogleCalendarWindow,
  upsertGoogleScheduledTask,
  upsertGoogleScheduleBlock,
} = vi.hoisted(() => ({
  deleteGoogleTask: vi.fn(),
  fakeDb: { query: vi.fn() },
  deleteGoogleScheduleBlock: vi.fn(),
  syncGoogleCalendarWindow: vi.fn(),
  upsertGoogleScheduledTask: vi.fn(),
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

vi.mock("../integration/google-tasks.js", () => ({
  deleteGoogleTask,
  upsertGoogleScheduledTask,
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
  priority: "high",
  scheduledBlockId: "3f441c84-f3c7-4f40-8e88-8f2a6520f528",
  togglProjectId: null,
  completedOnDate: null,
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
  googleTaskId: null,
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
    countHiddenCalendarEventsForRange: vi.fn().mockResolvedValue(0),
    getCalendarSyncRun: vi.fn(),
    upsertCalendarSyncRun: vi.fn().mockResolvedValue({
      id: "sync-run-1",
      provider: "google",
      plannerDate: "2026-04-06",
      tzOffsetMinutes: 0,
      sourceCalendarIds: ["primary"],
      syncedAt: "2026-04-06T09:00:00.000Z",
      createdAt: "2026-04-06T09:00:00.000Z",
      updatedAt: "2026-04-06T09:00:00.000Z",
    }),
    upsertCalendarEvent: vi.fn(),
    upsertIntegrationToken: vi.fn(),
    deleteStaleCalendarEvents: vi.fn(),
  };
}

describe("planner-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertGoogleScheduledTask.mockResolvedValue("google-task-123");
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
              syncPlannerBlocksToCalendar: false,
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
              syncPlannerBlocksToCalendar: false,
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

  it("deletes Google Task mirrors when deleting scheduled tasks", async () => {
    const repository = createRepositoryMock();
    const googleTaskBlock = {
      ...baseBlock,
      googleEventId: null,
      googleTaskId: "google-task-123",
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
              plannerSyncTarget: "task",
            },
          }
        : null,
    );
    repository.getTask.mockResolvedValue(baseTask);
    repository.getScheduleBlock.mockResolvedValue(googleTaskBlock);
    repository.getActiveTimer.mockResolvedValue(null);
    repository.deleteScheduleBlock.mockResolvedValue(googleTaskBlock);
    repository.deleteTask.mockResolvedValue(baseTask);

    const service = new PlannerService(repository as never);

    await service.applyChange("task.delete", { taskId: baseTask.id }, "user");

    expect(deleteGoogleTask).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "google-token", calendarId: "primary" }),
      "google-task-123",
    );
    expect(deleteGoogleScheduleBlock).not.toHaveBeenCalled();
  });

  it("creates unscheduled planner tasks without a Google Tasks side effect", async () => {
    const repository = createRepositoryMock();
    const createdTask = {
      ...baseTask,
      id: "970c02c6-d0e2-491d-a386-4d447b6dce7a",
      title: "Deep work",
      notes: "Protect focus time",
      estimatedMinutes: 60,
      status: "planned" as const,
      scheduledBlockId: null,
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
              syncPlannerBlocksToCalendar: false,
            },
          }
        : null,
    );
    repository.getDraft.mockResolvedValue(
      createDraft("task.create", {
        title: "Deep work",
        notes: "Protect focus time",
        estimatedMinutes: 60,
        priority: "high",
        status: "planned",
        plannerDate: "2026-04-06",
      }),
    );
    repository.createTask.mockResolvedValue(createdTask);
    repository.updateDraftStatus.mockResolvedValue({
      ...createDraft("task.create", { title: "Deep work" }),
      status: "applied",
      appliedAt: "2026-04-06T09:05:00.000Z",
    });

    const service = new PlannerService(repository as never);

    await service.confirmDraft("draft-1", "user");

    expect(repository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Deep work",
        notes: "Protect focus time",
        estimatedMinutes: 60,
        priority: "high",
        status: "planned",
      }),
      fakeDb,
    );
    expect(upsertGoogleScheduledTask).not.toHaveBeenCalled();
    expect(upsertGoogleScheduleBlock).not.toHaveBeenCalled();
  });

  it("keeps local task creation independent of Google Tasks scope", async () => {
    const repository = createRepositoryMock();
    const createdTask = {
      ...baseTask,
      id: "970c02c6-d0e2-491d-a386-4d447b6dce7a",
      title: "Deep work",
      notes: "Protect focus time",
      estimatedMinutes: 60,
      status: "planned" as const,
      scheduledBlockId: null,
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
    repository.createTask.mockResolvedValue(createdTask);

    const service = new PlannerService(repository as never);

    await expect(
      service.applyChange(
        "task.create",
        {
          title: "Deep work",
          notes: "Protect focus time",
          estimatedMinutes: 60,
          priority: "high",
          status: "planned",
          plannerDate: "2026-04-06",
        },
        "user",
      ),
    ).resolves.toEqual({
      status: "applied",
      kind: "task.create",
      diffSummary: 'Create task "Deep work"',
    });

    expect(repository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Deep work",
        notes: "Protect focus time",
      }),
      fakeDb,
    );
    expect(upsertGoogleScheduledTask).not.toHaveBeenCalled();
  });

  it("resizes a scheduled block when task duration changes", async () => {
    const repository = createRepositoryMock();
    const updatedTask = {
      ...baseTask,
      estimatedMinutes: 90,
      updatedAt: "2026-04-06T09:15:00.000Z",
    };
    const resizedBlock = {
      ...baseBlock,
      endAt: "2026-04-06T18:30:00.000Z",
      state: "sync_pending" as const,
      updatedAt: "2026-04-06T09:15:00.000Z",
    };
    const syncedBlock = {
      ...resizedBlock,
      googleEventId: "google-event-456",
      state: "synced" as const,
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
    repository.getTask
      .mockResolvedValueOnce(baseTask)
      .mockResolvedValueOnce(updatedTask);
    repository.updateTask.mockResolvedValue(updatedTask);
    repository.getScheduleBlock
      .mockResolvedValueOnce(baseBlock)
      .mockResolvedValueOnce(resizedBlock);
    repository.listScheduleBlocksForRange.mockResolvedValue([]);
    repository.listCalendarEventsForRange.mockResolvedValue([]);
    repository.updateScheduleBlock
      .mockResolvedValueOnce(resizedBlock)
      .mockResolvedValueOnce(syncedBlock);
    repository.createAuditLog.mockResolvedValue({});
    repository.upsertCalendarEvent.mockResolvedValue({
      id: "event-row-1",
      externalEventId: "google-event-456",
      title: updatedTask.title,
      startAt: resizedBlock.startAt,
      endAt: resizedBlock.endAt,
      isAppManaged: true,
      scheduleBlockId: resizedBlock.id,
      rawPayload: { source: "timefraim", pendingSync: false },
      externalUpdatedAt: null,
      dismissedExternalUpdatedAt: null,
      createdAt: "2026-04-06T09:15:00.000Z",
      updatedAt: "2026-04-06T09:15:00.000Z",
    });
    upsertGoogleScheduleBlock.mockResolvedValue("google-event-456");

    const service = new PlannerService(repository as never);

    await service.applyChange(
      "task.update",
      {
        taskId: baseTask.id,
        title: baseTask.title,
        notes: baseTask.notes,
        estimatedMinutes: 90,
        priority: baseTask.priority,
        status: baseTask.status,
      },
      "user",
    );

    expect(repository.updateScheduleBlock).toHaveBeenNthCalledWith(
      1,
      baseBlock.id,
      {
        startAt: undefined,
        endAt: "2026-04-06T18:30:00.000Z",
        source: undefined,
        state: "sync_pending",
      },
      fakeDb,
    );
    expect(upsertGoogleScheduleBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({ accessToken: "google-token", calendarId: "primary" }),
        task: updatedTask,
        block: resizedBlock,
      }),
    );
    expect(repository.updateScheduleBlock).toHaveBeenNthCalledWith(
      2,
      resizedBlock.id,
      { googleEventId: "google-event-456", googleTaskId: null, state: "synced" },
      fakeDb,
    );
  });

  it("rejects conflicting duration changes for scheduled tasks", async () => {
    const repository = createRepositoryMock();
    const conflictingBlock: ScheduleBlock = {
      ...baseBlock,
      id: "11111111-1111-4111-8111-111111111111",
      taskId: "2aa5ea1a-c64d-4a40-b9f4-bbc20d4cbda1",
      startAt: "2026-04-06T18:00:00.000Z",
      endAt: "2026-04-06T18:45:00.000Z",
    };

    repository.getIntegrationToken.mockResolvedValue(null);
    repository.getTask.mockResolvedValue(baseTask);
    repository.updateTask.mockResolvedValue({
      ...baseTask,
      estimatedMinutes: 90,
      updatedAt: "2026-04-06T09:15:00.000Z",
    });
    repository.getScheduleBlock.mockResolvedValue(baseBlock);
    repository.listScheduleBlocksForRange.mockResolvedValue([baseBlock, conflictingBlock]);
    repository.listCalendarEventsForRange.mockResolvedValue([]);

    const service = new PlannerService(repository as never);

    await expect(
      service.applyChange(
        "task.update",
        {
          taskId: baseTask.id,
          title: baseTask.title,
          notes: baseTask.notes,
          estimatedMinutes: 90,
          priority: baseTask.priority,
          status: baseTask.status,
        },
        "user",
      ),
    ).rejects.toThrow("Schedule conflict with Scheduled block 11111111");

    expect(repository.updateScheduleBlock).not.toHaveBeenCalled();
    expect(repository.createAuditLog).not.toHaveBeenCalled();
    expect(upsertGoogleScheduleBlock).not.toHaveBeenCalled();
  });

  it("leaves the schedule block untouched when task duration does not change", async () => {
    const repository = createRepositoryMock();
    const renamedTask = {
      ...baseTask,
      title: "Refined task",
      updatedAt: "2026-04-06T09:15:00.000Z",
    };

    repository.getIntegrationToken.mockResolvedValue(null);
    repository.getTask.mockResolvedValue(baseTask);
    repository.updateTask.mockResolvedValue(renamedTask);
    repository.createAuditLog.mockResolvedValue({});

    const service = new PlannerService(repository as never);

    await service.applyChange(
      "task.update",
      {
        taskId: baseTask.id,
        title: renamedTask.title,
        notes: baseTask.notes,
        estimatedMinutes: baseTask.estimatedMinutes,
        priority: baseTask.priority,
        status: baseTask.status,
      },
      "user",
    );

    expect(repository.getScheduleBlock).not.toHaveBeenCalled();
    expect(repository.getScheduleBlockByTaskId).not.toHaveBeenCalled();
    expect(repository.updateScheduleBlock).not.toHaveBeenCalled();
    expect(upsertGoogleScheduleBlock).not.toHaveBeenCalled();
  });

  it("updates unscheduled task duration without touching schedule blocks", async () => {
    const repository = createRepositoryMock();
    const unscheduledTask = {
      ...baseTask,
      status: "planned" as const,
      scheduledBlockId: null,
      estimatedMinutes: 45,
    };
    const updatedTask = {
      ...unscheduledTask,
      estimatedMinutes: 90,
      updatedAt: "2026-04-06T09:15:00.000Z",
    };

    repository.getIntegrationToken.mockResolvedValue(null);
    repository.getTask.mockResolvedValue(unscheduledTask);
    repository.updateTask.mockResolvedValue(updatedTask);
    repository.createAuditLog.mockResolvedValue({});

    const service = new PlannerService(repository as never);

    await service.applyChange(
      "task.update",
      {
        taskId: unscheduledTask.id,
        title: unscheduledTask.title,
        notes: unscheduledTask.notes,
        estimatedMinutes: 90,
        priority: unscheduledTask.priority,
        status: unscheduledTask.status,
      },
      "user",
    );

    expect(repository.getScheduleBlock).not.toHaveBeenCalled();
    expect(repository.getScheduleBlockByTaskId).not.toHaveBeenCalled();
    expect(repository.updateScheduleBlock).not.toHaveBeenCalled();
    expect(upsertGoogleScheduleBlock).not.toHaveBeenCalled();
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

    expect(repository.updateTask).toHaveBeenCalledWith(
      unscheduledTask.id,
      { scheduledBlockId: createdBlock.id, status: "scheduled" },
      fakeDb,
    );
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

  it("creates a Google Task when timeline sync targets Google Tasks", async () => {
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
      googleTaskId: null,
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
              plannerSyncTarget: "task",
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
    repository.getScheduleBlock.mockResolvedValue(createdBlock);
    repository.updateDraftStatus.mockResolvedValue({
      ...createDraft("schedule_block.create", draftPayload),
      status: "applied",
      appliedAt: "2026-04-06T09:10:00.000Z",
    });
    upsertGoogleScheduledTask.mockResolvedValue("google-task-123");

    const service = new PlannerService(repository as never);

    await service.confirmDraft("draft-1", "user");

    expect(repository.createScheduleBlock).toHaveBeenCalledWith(
      expect.objectContaining({ state: "sync_pending" }),
      fakeDb,
    );
    expect(upsertGoogleScheduledTask).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({ accessToken: "google-token", calendarId: "primary" }),
        task: unscheduledTask,
        block: createdBlock,
      }),
    );
    expect(repository.updateScheduleBlock).toHaveBeenCalledWith(
      createdBlock.id,
      { googleEventId: null, googleTaskId: "google-task-123", state: "synced" },
      fakeDb,
    );
    expect(upsertGoogleScheduleBlock).not.toHaveBeenCalled();
    expect(repository.upsertCalendarEvent).not.toHaveBeenCalled();
  });

  it("switches an existing Google event mirror to a Google Task on timeline update", async () => {
    const repository = createRepositoryMock();
    const movedBlock = {
      ...baseBlock,
      startAt: "2026-04-06T18:00:00.000Z",
      endAt: "2026-04-06T18:45:00.000Z",
      state: "sync_pending" as const,
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
              plannerSyncTarget: "task",
            },
          }
        : null,
    );
    repository.getScheduleBlock
      .mockResolvedValueOnce(baseBlock)
      .mockResolvedValueOnce(movedBlock);
    repository.getTask.mockResolvedValue(baseTask);
    repository.listScheduleBlocksForRange.mockResolvedValue([]);
    repository.listCalendarEventsForRange.mockResolvedValue([]);
    repository.updateScheduleBlock.mockResolvedValueOnce(movedBlock);
    repository.createAuditLog.mockResolvedValue({});
    upsertGoogleScheduledTask.mockResolvedValue("google-task-123");

    const service = new PlannerService(repository as never);

    await service.applyChange(
      "schedule_block.update",
      {
        scheduleBlockId: baseBlock.id,
        startAt: movedBlock.startAt,
        endAt: movedBlock.endAt,
      },
      "user",
    );

    expect(deleteGoogleScheduleBlock).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "google-token", calendarId: "primary" }),
      "google-event-123",
    );
    expect(repository.deleteCalendarEventByScheduleBlockId).toHaveBeenCalledWith(baseBlock.id, fakeDb);
    expect(repository.updateScheduleBlock).toHaveBeenNthCalledWith(
      2,
      baseBlock.id,
      { googleEventId: null, googleTaskId: "google-task-123", state: "synced" },
      fakeDb,
    );
  });

  it("keeps scheduled blocks local when planner calendar sync is disabled", async () => {
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
      state: "confirmed" as const,
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
              syncPlannerBlocksToCalendar: false,
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
    repository.updateDraftStatus.mockResolvedValue({
      ...createDraft("schedule_block.create", draftPayload),
      status: "applied",
      appliedAt: "2026-04-06T09:10:00.000Z",
    });

    const service = new PlannerService(repository as never);

    await service.confirmDraft("draft-1", "user");

    expect(repository.createScheduleBlock).toHaveBeenCalledWith(
      expect.objectContaining({ state: "confirmed" }),
      fakeDb,
    );
    expect(upsertGoogleScheduleBlock).not.toHaveBeenCalled();
    expect(upsertGoogleScheduledTask).not.toHaveBeenCalled();
    expect(repository.upsertCalendarEvent).not.toHaveBeenCalled();
  });

  it("moves scheduled blocks without patching task priority", async () => {
    const repository = createRepositoryMock();
    const movedBlock = {
      ...baseBlock,
      startAt: "2026-04-06T18:00:00.000Z",
      endAt: "2026-04-06T18:45:00.000Z",
      state: "confirmed" as const,
    };

    repository.getIntegrationToken.mockResolvedValue(null);
    repository.getScheduleBlock.mockResolvedValue(baseBlock);
    repository.getTask.mockResolvedValue(baseTask);
    repository.listScheduleBlocksForRange.mockResolvedValue([]);
    repository.listCalendarEventsForRange.mockResolvedValue([]);
    repository.updateScheduleBlock.mockResolvedValue(movedBlock);
    repository.createAuditLog.mockResolvedValue({});

    const service = new PlannerService(repository as never);

    await service.applyChange(
      "schedule_block.update",
      {
        scheduleBlockId: baseBlock.id,
        startAt: movedBlock.startAt,
        endAt: movedBlock.endAt,
      },
      "user",
    );

    expect(repository.updateTask).not.toHaveBeenCalled();
    expect(repository.updateScheduleBlock).toHaveBeenCalledWith(
      baseBlock.id,
      {
        startAt: movedBlock.startAt,
        endAt: movedBlock.endAt,
        source: undefined,
        state: "confirmed",
      },
      fakeDb,
    );
  });

  it("clears dismissals for synced Google events on every manual sync", async () => {
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
          endAt: "2026-04-06T16:00:00.000Z",
          isAppManaged: false,
          rawPayload: {},
          scheduleBlockId: null,
          externalUpdatedAt: "2026-04-06T07:30:00.000Z",
        },
      ]);

    const service = new PlannerService(repository as never);

    await service.syncGoogleCalendar("2026-04-06", 0);
    await service.syncGoogleCalendar("2026-04-06", 0);

    expect(repository.upsertCalendarEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        externalEventId: "evt-1",
        dismissedExternalUpdatedAt: null,
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

  it("records the selected calendar set when a manual calendar sync succeeds", async () => {
    const repository = createRepositoryMock();
    repository.getIntegrationToken.mockResolvedValue({
      provider: "google",
      access_token: "google-token",
      refresh_token: null,
      expires_at: null,
      metadata: {
        calendarId: "primary",
        email: "allowed@example.com",
        syncCalendarIds: ["work", "primary"],
      },
    });
    repository.listCalendarEventsForRange.mockResolvedValue([]);
    syncGoogleCalendarWindow.mockResolvedValueOnce([]);

    const service = new PlannerService(repository as never);

    const result = await service.syncGoogleCalendar("2026-04-06", -420);

    expect(repository.upsertCalendarSyncRun).toHaveBeenCalledWith(
      {
        provider: "google",
        plannerDate: "2026-04-06",
        tzOffsetMinutes: -420,
        sourceCalendarIds: ["primary", "work"],
      },
      fakeDb,
    );
    expect(result.calendarSync).toEqual({
      status: "fully_synced",
      syncedAt: "2026-04-06T09:00:00.000Z",
      hiddenEventCount: 0,
    });
  });
});
