import {
  calendarEventUpdateSchema,
  calendarSyncResultSchema,
  dayPlanSchema,
  plannerDuplicateResultSchema,
  plannerMutationResultSchema,
  scheduleBlockDuplicatePayloadSchema,
  scheduleBlockUpdateSchema,
  syncDraftSchema,
  taskDuplicatePayloadSchema,
  taskInputSchema,
  taskSchema,
  taskUpdateSchema,
  type CalendarEventUpdate,
  type CalendarSyncResult,
  type PlannerDuplicateResult,
  type PlannerMutationResult,
  type ScheduleBlockCreate,
  type ScheduleBlockDuplicatePayload,
  type ScheduleBlockUpdate,
  type SyncDraft,
  type Task,
  type TaskDuplicatePayload,
  type TaskInput,
  type TaskUpdate,
  type TimerStart,
  type TimerStartEvent,
} from "@timefraim/shared";
import { request, withQuery } from "@/lib/api-client";

type UpdateTaskInput = Omit<TaskUpdate, "taskId">;
type UpdateScheduleBlockInput = Omit<ScheduleBlockUpdate, "scheduleBlockId">;
type DuplicateTaskInput = Omit<TaskDuplicatePayload, "sourceTaskId">;
type DuplicateScheduleBlockInput = Omit<ScheduleBlockDuplicatePayload, "sourceBlockId">;

export const plannerApi = {
  getDayPlan: (token: string, date: string, tz: number) =>
    request(withQuery("/api/day-plan", { date, tz }), token, { schema: dayPlanSchema }),
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
  duplicateTask: (token: string, taskId: string, body: DuplicateTaskInput = {}) =>
    request<PlannerDuplicateResult, DuplicateTaskInput>(`/api/tasks/${taskId}/duplicate`, token, {
      method: "POST",
      body: taskDuplicatePayloadSchema.omit({ sourceTaskId: true }).parse(body),
      schema: plannerDuplicateResultSchema,
    }),
  duplicateScheduleBlock: (
    token: string,
    scheduleBlockId: string,
    body: DuplicateScheduleBlockInput,
  ) =>
    request<PlannerDuplicateResult, DuplicateScheduleBlockInput>(
      `/api/schedule-blocks/${scheduleBlockId}/duplicate`,
      token,
      {
        method: "POST",
        body: scheduleBlockDuplicatePayloadSchema.omit({ sourceBlockId: true }).parse(body),
        schema: plannerDuplicateResultSchema,
      },
    ),
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
  updateCalendarEvent: (token: string, calendarEventId: string, body: CalendarEventUpdate) =>
    request<PlannerMutationResult, CalendarEventUpdate>(
      `/api/calendar-events/${calendarEventId}`,
      token,
      {
        method: "PATCH",
        body: calendarEventUpdateSchema.parse(body),
        schema: plannerMutationResultSchema,
      },
    ),
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
    request<CalendarSyncResult>(withQuery("/api/calendar/sync", { date, tz }), token, {
      method: "POST",
      schema: calendarSyncResultSchema,
    }),
  startTimer: (token: string, body: TimerStart) =>
    request<PlannerMutationResult, TimerStart>("/api/timers/start", token, {
      method: "POST",
      body,
      schema: plannerMutationResultSchema,
    }),
  startEventTimer: (token: string, body: TimerStartEvent) =>
    request<PlannerMutationResult, TimerStartEvent>("/api/timers/start-event", token, {
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
};
