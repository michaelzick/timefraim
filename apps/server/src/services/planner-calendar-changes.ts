import type { DraftHandlerContext } from "./planner-service-types.js";

export async function applyCalendarEventDismissDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as { calendarEventId: string };
  const calendarEvent = await context.repository.getCalendarEvent(payload.calendarEventId, context.client);
  if (!calendarEvent) {
    throw new Error(`Calendar event ${payload.calendarEventId} not found`);
  }
  if (calendarEvent.isAppManaged) {
    throw new Error("App-managed calendar events cannot be hidden");
  }

  await context.repository.dismissCalendarEvent(calendarEvent.id, context.client);
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "calendar_event",
      entityId: calendarEvent.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  return context.markApplied();
}

export async function applyCalendarEventUpdateDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as {
    calendarEventId: string;
    togglProjectId?: string | null;
  };
  const calendarEvent = await context.repository.getCalendarEvent(payload.calendarEventId, context.client);
  if (!calendarEvent) {
    throw new Error(`Calendar event ${payload.calendarEventId} not found`);
  }

  await context.repository.updateCalendarEvent(
    calendarEvent.id,
    { togglProjectId: payload.togglProjectId ?? null },
    context.client,
  );
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "calendar_event",
      entityId: calendarEvent.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  return context.markApplied();
}
