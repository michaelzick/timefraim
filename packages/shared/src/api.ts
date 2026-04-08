import { z } from "zod";
import { draftKindSchema } from "./drafts.js";
import { calendarEventViewSchema } from "./schedule.js";

export const plannerMutationResultSchema = z.object({
  status: z.literal("applied"),
  kind: draftKindSchema,
  diffSummary: z.string(),
});

export const calendarSyncResultSchema = z.object({
  date: z.string(),
  events: z.array(calendarEventViewSchema),
});

export type PlannerMutationResult = z.infer<typeof plannerMutationResultSchema>;
export type CalendarSyncResult = z.infer<typeof calendarSyncResultSchema>;
