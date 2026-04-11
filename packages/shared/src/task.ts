import { z } from "zod";

export const taskStatusSchema = z.enum([
  "inbox",
  "planned",
  "scheduled",
  "in_progress",
  "done",
  "archived",
]);
export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  notes: z.string().nullable().default(null),
  estimatedMinutes: z.number().int().positive(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  scheduledBlockId: z.string().uuid().nullable().optional(),
  togglProjectId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const taskInputSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(5000).optional().nullable(),
  estimatedMinutes: z.number().int().positive().max(12 * 60).default(30),
  status: taskStatusSchema.default("planned"),
  priority: taskPrioritySchema.default("low"),
  togglProjectId: z.string().optional().nullable(),
  plannerDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const taskUpdateSchema = taskInputSchema.partial().extend({
  taskId: z.string().uuid(),
});

export type Task = z.infer<typeof taskSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
