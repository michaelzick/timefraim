import { z } from "zod";

export const draftStatusSchema = z.enum(["pending", "applied", "rejected", "expired"]);
export const draftKindSchema = z.enum([
  "task.create",
  "task.update",
  "task.delete",
  "schedule_block.create",
  "schedule_block.update",
  "schedule_block.delete",
  "calendar_event.dismiss",
  "calendar_event.update",
  "timer.start",
  "timer.start_event",
  "timer.stop",
]);
export const actorRoleSchema = z.enum(["user", "assistant", "system"]);

export const syncDraftSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid().nullable(),
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

export type DraftKind = z.infer<typeof draftKindSchema>;
export type DraftStatus = z.infer<typeof draftStatusSchema>;
export type ActorRole = z.infer<typeof actorRoleSchema>;
export type SyncDraft = z.infer<typeof syncDraftSchema>;

function getPayloadString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function formatDraftSummary(kind: DraftKind, payload: Record<string, unknown>): string {
  switch (kind) {
    case "task.create":
      return `Create task "${getPayloadString(payload.title, "Untitled task")}"`;
    case "task.update":
      return `Update task ${getPayloadString(payload.taskId)}`.trim();
    case "task.delete":
      return `Delete task ${getPayloadString(payload.taskId)}`.trim();
    case "schedule_block.create":
      return `Schedule task ${getPayloadString(payload.taskId)} from ${getPayloadString(payload.startAt)} to ${getPayloadString(payload.endAt)}`;
    case "schedule_block.update":
      return `Move schedule block ${getPayloadString(payload.scheduleBlockId)}`;
    case "schedule_block.delete":
      return `Remove schedule block ${getPayloadString(payload.scheduleBlockId)}`;
    case "calendar_event.dismiss":
      return `Hide calendar event ${getPayloadString(payload.calendarEventId)}`.trim();
    case "calendar_event.update":
      return `Update calendar event ${getPayloadString(payload.calendarEventId)}`.trim();
    case "timer.start":
      return `Start timer for task ${getPayloadString(payload.taskId)}`;
    case "timer.start_event":
      return `Start timer for calendar event ${getPayloadString(payload.calendarEventId)}`;
    case "timer.stop":
      return "Stop active timer";
    default:
      return "Apply planner change";
  }
}
