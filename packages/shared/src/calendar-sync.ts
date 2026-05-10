import { z } from "zod";

export const calendarSyncStatusSchema = z.enum([
  "not_synced",
  "fully_synced",
  "partially_synced",
]);

export const calendarSyncSchema = z.object({
  status: calendarSyncStatusSchema,
  syncedAt: z.string().datetime().nullable(),
  hiddenEventCount: z.number().int().nonnegative(),
});

export type CalendarSyncStatus = z.infer<typeof calendarSyncStatusSchema>;
export type CalendarSync = z.infer<typeof calendarSyncSchema>;
