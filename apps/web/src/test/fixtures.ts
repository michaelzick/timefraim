import type { AuthSession, DayPlan, Task } from "@timefraim/shared";

export function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1f8f9660-0000-4000-8000-000000000001",
    title: "Plan launch week",
    notes: "Outline the week and protect deep-work blocks.",
    estimatedMinutes: 45,
    status: "planned",
    priority: "medium",
    scheduledBlockId: null,
    togglProjectId: null,
    createdAt: "2026-04-06T08:00:00.000Z",
    updatedAt: "2026-04-06T08:00:00.000Z",
    ...overrides,
  };
}

export function buildDayPlan(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    date: "2026-04-06",
    tasks: [
      buildTask(),
      buildTask({
        id: "task-1f8f9660-0000-4000-8000-000000000002",
        title: "Review roadmap",
        estimatedMinutes: 30,
      }),
    ],
    scheduleBlocks: [],
    calendarEvents: [],
    drafts: [],
    auditLogs: [],
    activeTimer: null,
    integrationStatus: {
      googleConnected: true,
      googleEmail: "allowed@example.com",
      googleCalendarId: "primary",
      togglConnected: true,
      togglWorkspaceId: "workspace-1",
      mcpFullAccessConfigured: true,
      mcpReadOnlyConfigured: true,
      tunnelBaseUrl: "https://example.ngrok.app",
    },
    ...overrides,
  };
}

export function buildAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    user: {
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: "https://example.com/avatar.png",
    },
    integrationStatus: buildDayPlan().integrationStatus,
    ...overrides,
  };
}
