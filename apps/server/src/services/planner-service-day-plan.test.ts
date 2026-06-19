import type { AuditLog, IntegrationStatus, Task } from "@timefraim/shared";
import { describe, expect, it, vi } from "vitest";

const { fakeDb } = vi.hoisted(() => ({
  fakeDb: { query: vi.fn() },
}));

vi.mock("../db/pool.js", () => ({
  pool: fakeDb,
  withTransaction: vi.fn(),
}));

import { PlannerService } from "./planner-service.js";

const task: Task = {
  id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
  title: "Journal",
  notes: null,
  estimatedMinutes: 30,
  status: "planned",
  priority: "medium",
  category: "personal",
  scheduledBlockId: null,
  togglProjectId: null,
  completedOnDate: null,
  createdAt: "2026-04-20T08:00:00.000Z",
  updatedAt: "2026-04-20T08:00:00.000Z",
};

const integrationStatus: IntegrationStatus = {
  googleConnected: false,
  googleEmail: null,
  googleCalendarId: "primary",
  togglConnected: false,
  togglWorkspaceId: null,
  togglWorkspaceName: null,
  togglDefaultProjectId: null,
  togglDefaultProjectName: null,
  togglHasSavedToken: false,
  togglApiTokenHint: null,
  mcpFullAccessConfigured: false,
  mcpReadOnlyConfigured: false,
  tunnelBaseUrl: null,
};

function buildAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "d56cc8c3-58c0-4629-bc6a-e0b0a73c1c0c",
    actorRole: "user",
    action: "timer.start",
    entityType: "timer_session",
    entityId: "9ab774ee-0b28-4dc3-b829-4f55b74af0f7",
    diffSummary: `Start timer for task ${task.id}`,
    displaySummary: `Start timer for task ${task.id}`,
    payload: { taskId: task.id },
    createdAt: "2026-04-20T08:00:00.000Z",
    ...overrides,
  };
}

function createRepositoryMock() {
  return {
    getActiveTimer: vi.fn().mockResolvedValue(null),
    getIntegrationStatus: vi.fn().mockReturnValue(integrationStatus),
    getIntegrationToken: vi.fn().mockResolvedValue(null),
    getCalendarSyncRun: vi.fn().mockResolvedValue(null),
    getUserTogglConnection: vi.fn().mockResolvedValue(null),
    countHiddenCalendarEventsForRange: vi.fn().mockResolvedValue(0),
    listCalendarEventsForRange: vi.fn().mockResolvedValue([]),
    listDrafts: vi.fn().mockResolvedValue([]),
    listIntegrationTokens: vi.fn().mockResolvedValue([]),
    listRecentAuditLogs: vi.fn().mockResolvedValue([buildAuditLog()]),
    listScheduleBlocksForRange: vi.fn().mockResolvedValue([]),
    listTasks: vi.fn().mockResolvedValue([task]),
  };
}

describe("PlannerService.getDayPlan", () => {
  it("returns human-readable audit log display summaries", async () => {
    const repository = createRepositoryMock();
    const service = new PlannerService(repository as never);

    const dayPlan = await service.getDayPlan("user-1", "2026-04-20", 0);

    expect(dayPlan.auditLogs[0]?.displaySummary).toBe('Start timer for task "Journal"');
    expect(dayPlan.calendarSync).toEqual({
      status: "not_synced",
      syncedAt: null,
      hiddenEventCount: 0,
    });
  });

  it("returns a fully synced calendar status for a matching sync run", async () => {
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
    repository.getCalendarSyncRun.mockResolvedValue({
      id: "sync-run-1",
      provider: "google",
      plannerDate: "2026-04-20",
      tzOffsetMinutes: 0,
      sourceCalendarIds: ["primary"],
      syncedAt: "2026-04-20T09:00:00.000Z",
      createdAt: "2026-04-20T09:00:00.000Z",
      updatedAt: "2026-04-20T09:00:00.000Z",
    });

    const service = new PlannerService(repository as never);

    const dayPlan = await service.getDayPlan("user-1", "2026-04-20", 0);

    expect(dayPlan.calendarSync).toEqual({
      status: "fully_synced",
      syncedAt: "2026-04-20T09:00:00.000Z",
      hiddenEventCount: 0,
    });
  });

  it("returns a partially synced calendar status when synced events are hidden", async () => {
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
    repository.getCalendarSyncRun.mockResolvedValue({
      id: "sync-run-1",
      provider: "google",
      plannerDate: "2026-04-20",
      tzOffsetMinutes: 0,
      sourceCalendarIds: ["primary"],
      syncedAt: "2026-04-20T09:00:00.000Z",
      createdAt: "2026-04-20T09:00:00.000Z",
      updatedAt: "2026-04-20T09:00:00.000Z",
    });
    repository.countHiddenCalendarEventsForRange.mockResolvedValue(2);

    const service = new PlannerService(repository as never);

    const dayPlan = await service.getDayPlan("user-1", "2026-04-20", 0);

    expect(dayPlan.calendarSync).toEqual({
      status: "partially_synced",
      syncedAt: "2026-04-20T09:00:00.000Z",
      hiddenEventCount: 2,
    });
  });

  it("uses selected source calendars as part of the sync-run lookup", async () => {
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

    const service = new PlannerService(repository as never);

    const dayPlan = await service.getDayPlan("user-1", "2026-04-20", -420);

    expect(repository.getCalendarSyncRun).toHaveBeenCalledWith(
      {
        provider: "google",
        plannerDate: "2026-04-20",
        tzOffsetMinutes: -420,
        sourceCalendarIds: ["primary", "work"],
      },
      fakeDb,
    );
    expect(dayPlan.calendarSync).toEqual({
      status: "not_synced",
      syncedAt: null,
      hiddenEventCount: 0,
    });
  });
});
