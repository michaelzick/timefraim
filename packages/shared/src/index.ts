import { z } from "zod";

export const taskStatusSchema = z.enum([
  "inbox",
  "planned",
  "scheduled",
  "in_progress",
  "done",
  "archived",
]);

export const scheduleBlockSourceSchema = z.enum(["manual", "ai", "sync"]);
export const scheduleBlockStateSchema = z.enum([
  "draft",
  "confirmed",
  "sync_pending",
  "synced",
  "failed",
  "cancelled",
]);

export const draftStatusSchema = z.enum(["pending", "applied", "rejected", "expired"]);
export const draftKindSchema = z.enum([
  "task.create",
  "task.update",
  "task.delete",
  "schedule_block.create",
  "schedule_block.update",
  "schedule_block.delete",
  "calendar_event.dismiss",
  "timer.start",
  "timer.stop",
]);
export const actorRoleSchema = z.enum(["user", "assistant", "system"]);
export const mcpProfileSchema = z.enum(["read-only", "full-access"]);

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  notes: z.string().nullable().default(null),
  estimatedMinutes: z.number().int().positive(),
  status: taskStatusSchema,
  scheduledBlockId: z.string().uuid().nullable().optional(),
  togglProjectId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const taskInputSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(5000).optional().nullable(),
  estimatedMinutes: z.number().int().positive().max(12 * 60).default(30),
  status: taskStatusSchema.default("inbox"),
  togglProjectId: z.string().optional().nullable(),
});

export const taskUpdateSchema = taskInputSchema.partial().extend({
  taskId: z.string().uuid(),
});

export const scheduleBlockSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  source: scheduleBlockSourceSchema,
  state: scheduleBlockStateSchema,
  googleEventId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const scheduleBlockCreateSchema = z.object({
  taskId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  source: scheduleBlockSourceSchema.default("manual"),
});

export const scheduleBlockUpdateSchema = z.object({
  scheduleBlockId: z.string().uuid(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  source: scheduleBlockSourceSchema.optional(),
});

export const scheduleBlockDeleteSchema = z.object({
  scheduleBlockId: z.string().uuid(),
});

export const calendarEventViewSchema = z.object({
  id: z.string(),
  externalEventId: z.string(),
  title: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isAppManaged: z.boolean(),
});

export const integrationStatusSchema = z.object({
  googleConnected: z.boolean(),
  googleEmail: z.string().email().nullable(),
  googleCalendarId: z.string(),
  togglConnected: z.boolean(),
  togglWorkspaceId: z.string().nullable(),
  mcpFullAccessConfigured: z.boolean(),
  mcpReadOnlyConfigured: z.boolean(),
  tunnelBaseUrl: z.string().nullable(),
});

export const syncDraftSchema = z.object({
  id: z.string().uuid(),
  kind: draftKindSchema,
  payload: z.record(z.string(), z.unknown()),
  diffSummary: z.string(),
  status: draftStatusSchema,
  actorRole: actorRoleSchema,
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  appliedAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable(),
});

export const timerSessionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  togglEntryId: z.string().nullable(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  durationSeconds: z.number().int().nullable(),
  source: scheduleBlockSourceSchema,
});

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  actorRole: actorRoleSchema,
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  diffSummary: z.string(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});

export const dayPlanSchema = z.object({
  date: z.string(),
  tasks: z.array(taskSchema),
  scheduleBlocks: z.array(scheduleBlockSchema),
  calendarEvents: z.array(calendarEventViewSchema),
  drafts: z.array(syncDraftSchema),
  auditLogs: z.array(auditLogSchema),
  activeTimer: timerSessionSchema.nullable(),
  integrationStatus: integrationStatusSchema,
});

export const togglConnectSchema = z.object({
  apiToken: z.string().min(1),
  workspaceId: z.string().min(1),
  defaultProjectId: z.string().optional().nullable(),
});

export const googleConnectSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  email: z.string().email(),
  calendarId: z.string().default("primary"),
});

export const timerStartSchema = z.object({
  taskId: z.string().uuid(),
  source: scheduleBlockSourceSchema.default("manual"),
});

export const timerStopSchema = z.object({
  source: scheduleBlockSourceSchema.default("manual"),
});

export const dayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tz: z.coerce.number().int().optional(),
});

export const authUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});

export const authSessionSchema = z.object({
  user: authUserSchema,
  integrationStatus: integrationStatusSchema,
});

export type Task = z.infer<typeof taskSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;
export type ScheduleBlockSource = z.infer<typeof scheduleBlockSourceSchema>;
export type ScheduleBlockState = z.infer<typeof scheduleBlockStateSchema>;
export type ScheduleBlockCreate = z.infer<typeof scheduleBlockCreateSchema>;
export type ScheduleBlockUpdate = z.infer<typeof scheduleBlockUpdateSchema>;
export type ScheduleBlockDelete = z.infer<typeof scheduleBlockDeleteSchema>;
export type CalendarEventView = z.infer<typeof calendarEventViewSchema>;
export type SyncDraft = z.infer<typeof syncDraftSchema>;
export type TimerSession = z.infer<typeof timerSessionSchema>;
export type TimerStart = z.infer<typeof timerStartSchema>;
export type TimerStop = z.infer<typeof timerStopSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type DayPlan = z.infer<typeof dayPlanSchema>;
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type DraftKind = z.infer<typeof draftKindSchema>;
export type DraftStatus = z.infer<typeof draftStatusSchema>;
export type ActorRole = z.infer<typeof actorRoleSchema>;
export type McpProfile = z.infer<typeof mcpProfileSchema>;

export function formatDraftSummary(kind: DraftKind, payload: Record<string, unknown>): string {
  switch (kind) {
    case "task.create":
      return `Create task "${String(payload.title ?? "Untitled task")}"`;
    case "task.update":
      return `Update task ${String(payload.taskId ?? "")}`.trim();
    case "task.delete":
      return `Delete task ${String(payload.taskId ?? "")}`.trim();
    case "schedule_block.create":
      return `Schedule task ${String(payload.taskId ?? "")} from ${String(payload.startAt ?? "")} to ${String(payload.endAt ?? "")}`;
    case "schedule_block.update":
      return `Move schedule block ${String(payload.scheduleBlockId ?? "")}`;
    case "schedule_block.delete":
      return `Remove schedule block ${String(payload.scheduleBlockId ?? "")}`;
    case "calendar_event.dismiss":
      return `Hide calendar event ${String(payload.calendarEventId ?? "")}`.trim();
    case "timer.start":
      return `Start timer for task ${String(payload.taskId ?? "")}`;
    case "timer.stop":
      return "Stop active timer";
    default:
      return "Apply planner change";
  }
}

export function addMinutes(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
