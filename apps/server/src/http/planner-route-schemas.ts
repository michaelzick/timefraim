import { z } from "zod";

export const taskIdParamsSchema = z.object({ taskId: z.string().uuid() });
export const scheduleBlockIdParamsSchema = z.object({
  scheduleBlockId: z.string().uuid(),
});
export const calendarEventIdParamsSchema = z.object({
  calendarEventId: z.string().uuid(),
});
export const draftIdSchema = z.object({ draftId: z.string().uuid() });
