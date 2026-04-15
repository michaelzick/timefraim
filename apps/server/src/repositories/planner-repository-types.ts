import type {
  ActorRole,
  DraftKind,
  IntegrationStatus,
  TogglProjectOption,
  TogglWorkspaceOption,
  TaskPriority,
  ScheduleBlockSource,
  ScheduleBlockState,
  TaskStatus,
} from "@timefraim/shared";

export type IntegrationTokenRow = {
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | Date | null;
  metadata: Record<string, unknown>;
};

export type CalendarEventRecord = {
  id: string;
  externalEventId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAppManaged: boolean;
  backgroundColor: string | null;
  foregroundColor: string | null;
  scheduleBlockId: string | null;
  rawPayload: Record<string, unknown>;
  externalUpdatedAt: string | null;
  dismissedExternalUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserTogglConnectionRecord = {
  userId: string;
  apiTokenCiphertext: string;
  apiTokenHint: string;
  workspaceId: string;
  workspaceName: string;
  defaultProjectId: string | null;
  defaultProjectName: string | null;
  availableWorkspaces: TogglWorkspaceOption[];
  availableProjects: TogglProjectOption[];
  lastValidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title: string;
  notes: string | null;
  estimatedMinutes: number;
  status: TaskStatus;
  priority: TaskPriority;
  togglProjectId: string | null;
};

export type TaskPatch = Partial<{
  title: string;
  notes: string | null;
  estimatedMinutes: number;
  status: TaskStatus;
  priority: TaskPriority;
  togglProjectId: string | null;
  scheduledBlockId: string | null;
}>;

export type CreateScheduleBlockInput = {
  taskId: string;
  startAt: string;
  endAt: string;
  source: ScheduleBlockSource;
  state: ScheduleBlockState;
};

export type ScheduleBlockPatch = Partial<{
  startAt: string;
  endAt: string;
  source: ScheduleBlockSource;
  state: ScheduleBlockState;
  googleEventId: string | null;
}>;

export type UpsertCalendarEventInput = {
  externalEventId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAppManaged: boolean;
  backgroundColor: string | null;
  foregroundColor: string | null;
  scheduleBlockId: string | null;
  rawPayload: Record<string, unknown>;
  externalUpdatedAt: string | null;
  dismissedExternalUpdatedAt: string | null;
};

export type CreateDraftInput = {
  kind: DraftKind;
  payload: Record<string, unknown>;
  diffSummary: string;
  actorRole: ActorRole;
  expiresAt: string;
  ownerUserId: string | null;
};

export type CreateAuditLogInput = {
  actorRole: ActorRole;
  action: string;
  entityType: string;
  entityId: string;
  diffSummary: string;
  payload: Record<string, unknown>;
};

export type EnvironmentStatus = Omit<
  IntegrationStatus,
  | "googleConnected"
  | "googleEmail"
  | "googleCalendarId"
  | "togglConnected"
  | "togglWorkspaceId"
  | "togglWorkspaceName"
  | "togglDefaultProjectId"
  | "togglDefaultProjectName"
  | "togglHasSavedToken"
  | "togglApiTokenHint"
>;
