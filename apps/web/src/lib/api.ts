import {
  authSessionSchema,
  dayPlanSchema,
  integrationStatusSchema,
  syncDraftSchema,
  taskSchema,
} from "@timefraim/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(
  path: string,
  token: string,
  options: {
    method?: string;
    body?: unknown;
    schema?: { parse: (value: unknown) => T };
  } = {},
): Promise<T> {
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
  return options.schema ? options.schema.parse(json) : (json as T);
}

export const api = {
  getAuthSession: (token: string) => request("/api/auth/me", token, { schema: authSessionSchema }),
  getDayPlan: (token: string, date: string, tz: number) =>
    request(`/api/day-plan?date=${date}&tz=${tz}`, token, { schema: dayPlanSchema }),
  getTasks: (token: string) => request("/api/tasks", token, { schema: taskSchema.array() }),
  createTask: (token: string, body: unknown) => request("/api/tasks", token, { method: "POST", body }),
  updateTask: (token: string, taskId: string, body: unknown) =>
    request(`/api/tasks/${taskId}`, token, { method: "PATCH", body }),
  deleteTask: (token: string, taskId: string) => request(`/api/tasks/${taskId}`, token, { method: "DELETE" }),
  createScheduleBlock: (token: string, body: unknown) =>
    request("/api/schedule-blocks", token, { method: "POST", body }),
  updateScheduleBlock: (token: string, scheduleBlockId: string, body: unknown) =>
    request(`/api/schedule-blocks/${scheduleBlockId}`, token, { method: "PATCH", body }),
  deleteScheduleBlock: (token: string, scheduleBlockId: string) =>
    request(`/api/schedule-blocks/${scheduleBlockId}`, token, { method: "DELETE" }),
  dismissCalendarEvent: (token: string, calendarEventId: string) =>
    request(`/api/calendar-events/${calendarEventId}/dismiss`, token, { method: "POST" }),
  getDrafts: (token: string) => request("/api/drafts", token, { schema: syncDraftSchema.array() }),
  confirmDraft: (token: string, draftId: string) =>
    request(`/api/drafts/${draftId}/confirm`, token, { method: "POST" }),
  rejectDraft: (token: string, draftId: string) =>
    request(`/api/drafts/${draftId}/reject`, token, { method: "POST" }),
  syncCalendar: (token: string, date: string, tz: number) =>
    request(`/api/calendar/sync?date=${date}&tz=${tz}`, token, { method: "POST" }),
  startTimer: (token: string, body: unknown) =>
    request("/api/timers/start", token, { method: "POST", body }),
  stopTimer: (token: string) => request("/api/timers/stop", token, { method: "POST", body: { source: "manual" } }),
  saveGoogleSession: (token: string, body: unknown) =>
    request("/api/integrations/google/session", token, {
      method: "POST",
      body,
      schema: integrationStatusSchema,
    }),
  saveTogglConnection: (token: string, body: unknown) =>
    request("/api/integrations/toggl/connect", token, {
      method: "POST",
      body,
      schema: integrationStatusSchema,
    }),
  getIntegrationStatus: (token: string) =>
    request("/api/integrations/status", token, { schema: integrationStatusSchema }),
};
