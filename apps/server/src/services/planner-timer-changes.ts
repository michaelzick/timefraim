import { finalizeTimerSession, resolveIdleTaskStatus } from "./planner-domain.js";
import { notFound } from "./planner-errors.js";
import type { DraftHandlerContext } from "./planner-service-types.js";

async function stopActiveTimerIfRunning(context: DraftHandlerContext) {
  const active = await context.repository.getActiveTimer(context.client);
  if (!active) {
    return;
  }

  if (active.taskId) {
    const previousTask = await context.repository.getTask(active.taskId, context.client);
    if (previousTask) {
      await context.repository.updateTask(
        previousTask.id,
        { status: resolveIdleTaskStatus(previousTask) },
        context.client,
      );
    }
  }

  const stopped = finalizeTimerSession(active, new Date().toISOString());
  await context.repository.stopTimer(active.id, stopped.endedAt!, stopped.durationSeconds!, context.client);
  context.sideEffects.push({ type: "toggl.stop", togglEntryId: active.togglEntryId });
}

export async function applyTimerStartDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as { taskId: string; source: "manual" | "ai" | "sync" };
  const task = await context.repository.getTask(payload.taskId, context.client);
  if (!task) {
    throw notFound(`Task ${payload.taskId} not found`);
  }

  await stopActiveTimerIfRunning(context);

  const timer = await context.repository.createTimerSession(
    { taskId: task.id, startedAt: new Date().toISOString(), source: payload.source },
    context.client,
  );
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "timer_session",
      entityId: timer.id,
      diffSummary: context.draft.diffSummary,
      payload: { ...context.draft.payload, taskTitle: task.title },
    },
    context.client,
  );
  context.sideEffects.push({ type: "toggl.start", taskId: task.id, timerSessionId: timer.id, source: payload.source });
  return context.markApplied();
}

export async function applyTimerStartEventDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as { calendarEventId: string; source: "manual" | "ai" | "sync" };
  const calendarEvent = await context.repository.getCalendarEvent(payload.calendarEventId, context.client);
  if (!calendarEvent) {
    throw notFound(`Calendar event ${payload.calendarEventId} not found`);
  }

  await stopActiveTimerIfRunning(context);

  const timer = await context.repository.createTimerSession(
    { calendarEventId: calendarEvent.id, startedAt: new Date().toISOString(), source: payload.source },
    context.client,
  );
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "timer_session",
      entityId: timer.id,
      diffSummary: context.draft.diffSummary,
      payload: { ...context.draft.payload, calendarEventTitle: calendarEvent.title },
    },
    context.client,
  );
  context.sideEffects.push({
    type: "toggl.start_event",
    calendarEventId: calendarEvent.id,
    eventTitle: calendarEvent.title,
    timerSessionId: timer.id,
    source: payload.source,
    togglProjectId: calendarEvent.togglProjectId,
  });
  return context.markApplied();
}

export async function applyTimerStopDraft(context: DraftHandlerContext) {
  const active = await context.repository.getActiveTimer(context.client);
  if (!active) {
    return context.markApplied();
  }

  const stopped = finalizeTimerSession(active, new Date().toISOString());
  await context.repository.stopTimer(active.id, stopped.endedAt!, stopped.durationSeconds!, context.client);

  if (active.taskId) {
    const task = await context.repository.getTask(active.taskId, context.client);
    if (task) {
      await context.repository.updateTask(task.id, { status: resolveIdleTaskStatus(task) }, context.client);
    }
  }

  context.sideEffects.push({ type: "toggl.stop", togglEntryId: active.togglEntryId });
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "timer_session",
      entityId: active.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  return context.markApplied();
}
