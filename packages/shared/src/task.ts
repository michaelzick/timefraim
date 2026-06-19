import { z } from "zod";

export const taskStatusSchema = z.enum([
  "inbox",
  "planned",
  "scheduled",
  "in_progress",
  "done",
]);
export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const taskCategorySchema = z.enum(["personal", "work"]);

const plannerDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const taskTitleInputSchema = z.string().min(1).max(200);
const taskNotesInputSchema = z.string().max(5000).optional().nullable();
const taskEstimatedMinutesInputSchema = z.number().int().positive().max(12 * 60);
const togglProjectIdInputSchema = z.string().optional().nullable();
const completedOnDateInputSchema = z.string().regex(plannerDateRegex).nullable().optional();
const plannerDateInputSchema = z.string().regex(plannerDateRegex).optional();
const tzOffsetMinutesInputSchema = z.number().int().min(-14 * 60).max(14 * 60).optional();

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  notes: z.string().nullable().default(null),
  estimatedMinutes: z.number().int().positive(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  category: taskCategorySchema.default("personal"),
  scheduledBlockId: z.string().uuid().nullable().optional(),
  scheduledStartAt: z.string().datetime().nullable().optional(),
  scheduledEndAt: z.string().datetime().nullable().optional(),
  togglProjectId: z.string().nullable().optional(),
  completedOnDate: z.string().regex(plannerDateRegex).nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const taskInputSchema = z.object({
  title: taskTitleInputSchema,
  notes: taskNotesInputSchema,
  estimatedMinutes: taskEstimatedMinutesInputSchema.default(30),
  status: taskStatusSchema.default("planned"),
  priority: taskPrioritySchema.default("low"),
  category: taskCategorySchema.default("personal"),
  togglProjectId: togglProjectIdInputSchema,
  completedOnDate: completedOnDateInputSchema,
  plannerDate: plannerDateInputSchema,
  tzOffsetMinutes: tzOffsetMinutesInputSchema,
});

export const taskUpdateSchema = z.object({
  taskId: z.string().uuid(),
  title: taskTitleInputSchema.optional(),
  notes: taskNotesInputSchema,
  estimatedMinutes: taskEstimatedMinutesInputSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  category: taskCategorySchema.optional(),
  togglProjectId: togglProjectIdInputSchema,
  completedOnDate: completedOnDateInputSchema,
  plannerDate: plannerDateInputSchema,
  tzOffsetMinutes: tzOffsetMinutesInputSchema,
});

export const taskDuplicatePayloadSchema = z.object({
  sourceTaskId: z.string().uuid(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  plannerDate: z.string().regex(plannerDateRegex).optional(),
  tzOffsetMinutes: tzOffsetMinutesInputSchema,
});

export type Task = z.infer<typeof taskSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskCategory = z.infer<typeof taskCategorySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
export type TaskDuplicatePayload = z.infer<typeof taskDuplicatePayloadSchema>;
