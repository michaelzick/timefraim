import type { TaskInput, TaskUpdate } from "@timefraim/shared";
import type { DraftHandlerContext } from "./planner-service-types.js";

export async function applyTaskCreateDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as TaskInput;
  const task = await context.repository.createTask(
    {
      title: payload.title,
      notes: payload.notes ?? null,
      estimatedMinutes: payload.estimatedMinutes ?? 30,
      status: payload.status ?? "inbox",
      togglProjectId: payload.togglProjectId ?? null,
    },
    context.client,
  );
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "task",
      entityId: task.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  return context.markApplied();
}

export async function applyTaskUpdateDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as TaskUpdate;
  const task = await context.repository.updateTask(
    payload.taskId,
    {
      title: payload.title,
      notes: payload.notes,
      estimatedMinutes: payload.estimatedMinutes,
      status: payload.status,
      togglProjectId: payload.togglProjectId,
    },
    context.client,
  );
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "task",
      entityId: task.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  return context.markApplied();
}

export async function applyTaskDeleteDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as { taskId: string };
  const task = await context.repository.getTask(payload.taskId, context.client);
  if (!task) {
    throw new Error(`Task ${payload.taskId} not found`);
  }

  const scheduledBlock = task.scheduledBlockId
    ? await context.repository.getScheduleBlock(task.scheduledBlockId, context.client)
    : null;
  const existingBlock = scheduledBlock ?? (await context.repository.getScheduleBlockByTaskId(task.id, context.client));
  const activeTimer = await context.repository.getActiveTimer(context.client);

  if (activeTimer?.taskId === task.id) {
    context.sideEffects.push({ type: "toggl.stop", togglEntryId: activeTimer.togglEntryId });
  }

  if (existingBlock) {
    await context.repository.deleteCalendarEventByScheduleBlockId(existingBlock.id, context.client);
    await context.repository.deleteScheduleBlock(existingBlock.id, context.client);
    context.sideEffects.push({
      type: "google.delete",
      googleEventId: existingBlock.googleEventId ?? null,
      scheduleBlockId: existingBlock.id,
    });
  }

  await context.repository.deleteTask(task.id, context.client);
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "task",
      entityId: task.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  return context.markApplied();
}
