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
  scheduledBlockId: null,
  togglProjectId: null,
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
    getUserTogglConnection: vi.fn().mockResolvedValue(null),
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
  });
});
