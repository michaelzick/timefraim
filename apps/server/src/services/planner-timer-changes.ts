import { finalizeTimerSession, resolveIdleTaskStatus } from "./planner-domain.js";
import type { DraftHandlerContext } from "./planner-service-types.js";

export async function applyTimerStartDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as { taskId: string; source: "manual" | "ai" | "sync" };
  const task = await context.repository.getTask(payload.taskId, context.client);
  if (!task) {
    throw new Error(`Task ${payload.taskId} not found`);
  }

  const active = await context.repository.getActiveTimer(context.client);
  if (active) {
    const previousTask = await context.repository.getTask(active.taskId, context.client);
    const stopped = finalizeTimerSession(active, new Date().toISOString());
    await context.repository.stopTimer(active.id, stopped.endedAt!, stopped.durationSeconds!, context.client);
    if (previousTask) {
      await context.repository.updateTask(
        previousTask.id,
        { status: resolveIdleTaskStatus(previousTask) },
        context.client,
      );
    }
    context.sideEffects.push({ type: "toggl.stop", togglEntryId: active.togglEntryId });
  }

  const timer = await context.repository.createTimerSession(
    { taskId: task.id, startedAt: new Date().toISOString(), source: payload.source },
    context.client,
  );
  await context.repository.updateTask(task.id, { status: "in_progress" }, context.client);
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "timer_session",
      entityId: timer.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  context.sideEffects.push({ type: "toggl.start", taskId: task.id, timerSessionId: timer.id, source: payload.source });
  return context.markApplied();
}

export async function applyTimerStopDraft(context: DraftHandlerContext) {
  const active = await context.repository.getActiveTimer(context.client);
  if (!active) {
    return context.markApplied();
  }

  const task = await context.repository.getTask(active.taskId, context.client);
  const stopped = finalizeTimerSession(active, new Date().toISOString());
  await context.repository.stopTimer(active.id, stopped.endedAt!, stopped.durationSeconds!, context.client);
  if (task) {
    await context.repository.updateTask(task.id, { status: resolveIdleTaskStatus(task) }, context.client);
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
