import { z } from "zod";
import { draftKindSchema } from "./drafts.js";
import { calendarEventViewSchema } from "./schedule.js";

export const apiErrorCodeSchema = z.enum([
  "invalid_input",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "dependency_unavailable",
  "timeout",
  "internal_error",
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  requestId: z.string(),
});

export const plannerMutationResultSchema = z.object({
  status: z.literal("applied"),
  kind: draftKindSchema,
  diffSummary: z.string(),
});

export const plannerDuplicateResultSchema = plannerMutationResultSchema.extend({
  createdTaskId: z.string().uuid().nullable(),
  createdScheduleBlockId: z.string().uuid().nullable(),
});

export const calendarSyncResultSchema = z.object({
  date: z.string(),
  events: z.array(calendarEventViewSchema),
});

export type PlannerMutationResult = z.infer<typeof plannerMutationResultSchema>;
export type PlannerDuplicateResult = z.infer<typeof plannerDuplicateResultSchema>;
export type CalendarSyncResult = z.infer<typeof calendarSyncResultSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
