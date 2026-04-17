import { z } from "zod";

export const scheduleBlockSourceSchema = z.enum(["manual", "ai", "sync"]);
export const scheduleBlockStateSchema = z.enum([
  "draft",
  "confirmed",
  "sync_pending",
  "synced",
  "failed",
  "cancelled",
]);

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
  backgroundColor: z.string().nullable().default(null),
  foregroundColor: z.string().nullable().default(null),
  sourceCalendarId: z.string().nullable().default(null),
  sourceCalendarName: z.string().nullable().default(null),
  togglProjectId: z.string().nullable().default(null),
});

export const calendarEventUpdateSchema = z.object({
  togglProjectId: z.string().nullable().optional(),
});

export const timerSessionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  calendarEventId: z.string().uuid().nullable(),
  togglEntryId: z.string().nullable(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  durationSeconds: z.number().int().nullable(),
  source: scheduleBlockSourceSchema,
});

export const timerStartSchema = z.object({
  taskId: z.string().uuid().optional(),
  calendarEventId: z.string().uuid().optional(),
  source: scheduleBlockSourceSchema.default("manual"),
});

export const timerStartEventSchema = z.object({
  calendarEventId: z.string().uuid(),
  source: scheduleBlockSourceSchema.default("manual"),
});

export const timerStopSchema = z.object({
  source: scheduleBlockSourceSchema.default("manual"),
});

export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;
export type ScheduleBlockSource = z.infer<typeof scheduleBlockSourceSchema>;
export type ScheduleBlockState = z.infer<typeof scheduleBlockStateSchema>;
export type ScheduleBlockCreate = z.infer<typeof scheduleBlockCreateSchema>;
export type ScheduleBlockUpdate = z.infer<typeof scheduleBlockUpdateSchema>;
export type ScheduleBlockDelete = z.infer<typeof scheduleBlockDeleteSchema>;
export type CalendarEventView = z.infer<typeof calendarEventViewSchema>;
export type CalendarEventUpdate = z.infer<typeof calendarEventUpdateSchema>;
export type TimerSession = z.infer<typeof timerSessionSchema>;
export type TimerStart = z.infer<typeof timerStartSchema>;
export type TimerStartEvent = z.infer<typeof timerStartEventSchema>;
export type TimerStop = z.infer<typeof timerStopSchema>;
