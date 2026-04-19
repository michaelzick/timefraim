import type { AuthSession, DayPlan, PlannerDuplicateResult, Task, TogglIntegrationSettings } from "@timefraim/shared";

export function buildDuplicateResult(overrides: Partial<PlannerDuplicateResult> = {}): PlannerDuplicateResult {
  return {
    status: "applied",
    kind: "task.duplicate",
    diffSummary: "Duplicated task",
    createdTaskId: null,
    createdScheduleBlockId: null,
    ...overrides,
  };
}

export const noopDuplicate: () => Promise<PlannerDuplicateResult> = () => Promise.resolve(buildDuplicateResult());

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
      togglWorkspaceName: "Personal",
      togglDefaultProjectId: "project-1",
      togglDefaultProjectName: "Deep Work",
      togglHasSavedToken: true,
      togglApiTokenHint: "••••7890",
      mcpFullAccessConfigured: true,
      mcpReadOnlyConfigured: true,
      tunnelBaseUrl: "https://example.ngrok.app",
    },
    ...overrides,
  };
}

export function buildTogglSettings(
  overrides: Partial<TogglIntegrationSettings> = {},
): TogglIntegrationSettings {
  return {
    connected: true,
    hasSavedToken: true,
    apiTokenHint: "••••7890",
    workspaceId: "workspace-1",
    workspaceName: "Personal",
    defaultProjectId: "project-1",
    defaultProjectName: "Deep Work",
    availableWorkspaces: [{ id: "workspace-1", name: "Personal" }],
    availableProjects: [
      { id: "project-1", name: "Deep Work", workspaceId: "workspace-1", active: true },
      { id: "project-2", name: "Client X / Bugfix", workspaceId: "workspace-1", active: true },
    ],
    lastValidatedAt: "2026-04-06T09:00:00.000Z",
    ...overrides,
  };
}

export function buildAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    user: {
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: "https://example.com/avatar.png",
    },
    integrationStatus: buildDayPlan().integrationStatus,
    ...overrides,
  };
}
