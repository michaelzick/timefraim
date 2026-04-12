import {
  authSessionSchema,
  calendarSyncResultSchema,
  dayPlanSchema,
  googleConnectSchema,
  integrationStatusSchema,
  plannerMutationResultSchema,
  scheduleBlockUpdateSchema,
  syncDraftSchema,
  taskInputSchema,
  taskSchema,
  taskUpdateSchema,
  togglConnectSchema,
  togglDiscoverInputSchema,
  togglDiscoverResultSchema,
  togglIntegrationSettingsSchema,
  type AuthSession,
  type CalendarSyncResult,
  type GoogleConnect,
  type IntegrationStatus,
  type PlannerMutationResult,
  type ScheduleBlockCreate,
  type ScheduleBlockUpdate,
  type SyncDraft,
  type Task,
  type TaskInput,
  type TaskUpdate,
  type TimerStart,
  type TogglConnect,
  type TogglDiscoverInput,
  type TogglDiscoverResult,
  type TogglIntegrationSettings,
} from "@timefraim/shared";
import { env } from "@/lib/env";

export const API_BASE_URL = env.apiBaseUrl;

type Schema<T> = {
  parse: (value: unknown) => T;
};

type RequestOptions<TResponse, TBody> = {
  method?: string;
  body?: TBody;
  schema?: Schema<TResponse>;
};

type UpdateTaskInput = Omit<TaskUpdate, "taskId">;
type UpdateScheduleBlockInput = Omit<ScheduleBlockUpdate, "scheduleBlockId">;

async function request<TResponse, TBody = never>(
  path: string,
  token: string,
  options: RequestOptions<TResponse, TBody> = {},
): Promise<TResponse> {
  const hasBody = typeof options.body !== "undefined";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };
    throw new Error(error.message ?? `Request failed with status ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return options.schema ? options.schema.parse(json) : (json as TResponse);
}

export const api = {
  getAuthSession: (token: string) =>
    request<AuthSession>("/api/auth/me", token, { schema: authSessionSchema }),
  getDayPlan: (token: string, date: string, tz: number) =>
    request(`/api/day-plan?date=${date}&tz=${tz}`, token, { schema: dayPlanSchema }),
  getTasks: (token: string) => request<Task[]>("/api/tasks", token, { schema: taskSchema.array() }),
  createTask: (token: string, body: TaskInput) =>
    request<PlannerMutationResult, TaskInput>("/api/tasks", token, {
      method: "POST",
      body: taskInputSchema.parse(body),
      schema: plannerMutationResultSchema,
    }),
  updateTask: (token: string, taskId: string, body: UpdateTaskInput) =>
    request<PlannerMutationResult, UpdateTaskInput>(`/api/tasks/${taskId}`, token, {
      method: "PATCH",
      body: taskUpdateSchema.omit({ taskId: true }).parse(body),
      schema: plannerMutationResultSchema,
    }),
  deleteTask: (token: string, taskId: string) =>
    request<PlannerMutationResult>(`/api/tasks/${taskId}`, token, {
      method: "DELETE",
      schema: plannerMutationResultSchema,
    }),
  createScheduleBlock: (token: string, body: ScheduleBlockCreate) =>
    request<PlannerMutationResult, ScheduleBlockCreate>("/api/schedule-blocks", token, {
      method: "POST",
      body,
      schema: plannerMutationResultSchema,
    }),
  updateScheduleBlock: (token: string, scheduleBlockId: string, body: UpdateScheduleBlockInput) =>
    request<PlannerMutationResult, UpdateScheduleBlockInput>(
      `/api/schedule-blocks/${scheduleBlockId}`,
      token,
      {
        method: "PATCH",
        body: scheduleBlockUpdateSchema.omit({ scheduleBlockId: true }).parse(body),
        schema: plannerMutationResultSchema,
      },
    ),
  deleteScheduleBlock: (token: string, scheduleBlockId: string) =>
    request<PlannerMutationResult>(`/api/schedule-blocks/${scheduleBlockId}`, token, {
      method: "DELETE",
      schema: plannerMutationResultSchema,
    }),
  dismissCalendarEvent: (token: string, calendarEventId: string) =>
    request<PlannerMutationResult>(`/api/calendar-events/${calendarEventId}/dismiss`, token, {
      method: "POST",
      schema: plannerMutationResultSchema,
    }),
  getDrafts: (token: string) =>
    request<SyncDraft[]>("/api/drafts", token, { schema: syncDraftSchema.array() }),
  confirmDraft: (token: string, draftId: string) =>
    request<SyncDraft>(`/api/drafts/${draftId}/confirm`, token, {
      method: "POST",
      schema: syncDraftSchema,
    }),
  rejectDraft: (token: string, draftId: string) =>
    request<SyncDraft>(`/api/drafts/${draftId}/reject`, token, {
      method: "POST",
      schema: syncDraftSchema,
    }),
  syncCalendar: (token: string, date: string, tz: number) =>
    request<CalendarSyncResult>(`/api/calendar/sync?date=${date}&tz=${tz}`, token, {
      method: "POST",
      schema: calendarSyncResultSchema,
    }),
  startTimer: (token: string, body: TimerStart) =>
    request<PlannerMutationResult, TimerStart>("/api/timers/start", token, {
      method: "POST",
      body,
      schema: plannerMutationResultSchema,
    }),
  stopTimer: (token: string) =>
    request<PlannerMutationResult, { source: "manual" }>("/api/timers/stop", token, {
      method: "POST",
      body: { source: "manual" },
      schema: plannerMutationResultSchema,
    }),
  saveGoogleSession: (token: string, body: GoogleConnect) =>
    request<IntegrationStatus, GoogleConnect>("/api/integrations/google/session", token, {
      method: "POST",
      body: googleConnectSchema.parse(body),
      schema: integrationStatusSchema,
    }),
  getTogglSettings: (token: string) =>
    request<TogglIntegrationSettings>("/api/integrations/toggl", token, {
      schema: togglIntegrationSettingsSchema,
    }),
  discoverTogglConnection: (token: string, body: TogglDiscoverInput) =>
    request<TogglDiscoverResult, TogglDiscoverInput>("/api/integrations/toggl/discover", token, {
      method: "POST",
      body: togglDiscoverInputSchema.parse(body),
      schema: togglDiscoverResultSchema,
    }),
  saveTogglConnection: (token: string, body: TogglConnect) =>
    request<TogglIntegrationSettings, TogglConnect>("/api/integrations/toggl/connect", token, {
      method: "POST",
      body: togglConnectSchema.parse(body),
      schema: togglIntegrationSettingsSchema,
    }),
  deleteTogglConnection: (token: string) =>
    request<TogglIntegrationSettings>("/api/integrations/toggl/connect", token, {
      method: "DELETE",
      schema: togglIntegrationSettingsSchema,
    }),
  getIntegrationStatus: (token: string) =>
    request<IntegrationStatus>("/api/integrations/status", token, {
      schema: integrationStatusSchema,
    }),
};
