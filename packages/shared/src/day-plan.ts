import { z } from "zod";
import { actorRoleSchema, syncDraftSchema } from "./drafts.js";
import { integrationStatusSchema } from "./integration.js";
import { calendarEventViewSchema, timerSessionSchema, scheduleBlockSchema } from "./schedule.js";
import { taskSchema } from "./task.js";

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  actorRole: actorRoleSchema,
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  diffSummary: z.string(),
  displaySummary: z.string(),
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

export const dayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tz: z.coerce.number().int().optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type DayPlan = z.infer<typeof dayPlanSchema>;
