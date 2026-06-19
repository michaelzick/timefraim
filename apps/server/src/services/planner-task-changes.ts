import type { TaskInput, TaskUpdate } from "@timefraim/shared";
import { notFound } from "./planner-errors.js";
import type { DraftHandlerContext } from "./planner-service-types.js";
import { updateScheduleBlockWithValidation } from "./planner-schedule-changes.js";
import type { TaskPatch } from "../repositories/planner-repository-types.js";
import { todayIsoDate } from "../utils/date.js";

async function queueGoogleTaskStatusSync(context: DraftHandlerContext, taskId: string, payload: TaskUpdate) {
  if (!context.googleConnected || typeof payload.status === "undefined") {
    return;
  }

  const block = await context.repository.getScheduleBlockByTaskId(taskId, context.client);
  if (!block?.googleTaskId) {
    return;
  }

  const alreadyQueued = context.sideEffects.some((effect) =>
    effect.type === "google.upsert"
    && effect.scheduleBlockId === block.id
    && effect.target === "task",
  );
  if (alreadyQueued) {
    return;
  }

  context.sideEffects.push({
    type: "google.upsert",
    target: "task",
    taskId,
    scheduleBlockId: block.id,
    plannerDate: payload.plannerDate,
    tzOffsetMinutes: payload.tzOffsetMinutes,
  });
}

function resolveCompletedOnDate(args: {
  payloadStatus: TaskUpdate["status"] | undefined;
  payloadCompletedOnDate: string | null | undefined;
  currentCompletedOnDate: string | null;
}): string | null | undefined {
  if (typeof args.payloadStatus === "undefined") {
    return typeof args.payloadCompletedOnDate === "undefined" ? undefined : args.payloadCompletedOnDate;
  }
  if (args.payloadStatus === "done") {
    if (typeof args.payloadCompletedOnDate !== "undefined" && args.payloadCompletedOnDate !== null) {
      return args.payloadCompletedOnDate;
    }
    return args.currentCompletedOnDate ?? todayIsoDate();
  }
  return null;
}

export async function applyTaskCreateDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as TaskInput & { plannerDate?: string };
  const status = payload.status ?? "planned";
  const task = await context.repository.createTask(
    {
      title: payload.title,
      notes: payload.notes ?? null,
      estimatedMinutes: payload.estimatedMinutes ?? 30,
      status,
      priority: payload.priority ?? "low",
      category: payload.category ?? "personal",
      togglProjectId: payload.togglProjectId ?? null,
      completedOnDate:
        status === "done" ? payload.completedOnDate ?? todayIsoDate() : null,
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
      payload: { ...context.draft.payload, taskTitle: task.title },
    },
    context.client,
  );
  return context.markApplied();
}

export async function applyTaskUpdateDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as TaskUpdate;
  const currentTask = await context.repository.getTask(payload.taskId, context.client);
  if (!currentTask) {
    throw notFound(`Task ${payload.taskId} not found`);
  }

  const completedOnDate = resolveCompletedOnDate({
    payloadStatus: payload.status,
    payloadCompletedOnDate: payload.completedOnDate,
    currentCompletedOnDate: currentTask.completedOnDate ?? null,
  });

  const patch: TaskPatch = {};
  if (typeof payload.title !== "undefined") patch.title = payload.title;
  if (typeof payload.notes !== "undefined") patch.notes = payload.notes;
  if (typeof payload.estimatedMinutes !== "undefined") patch.estimatedMinutes = payload.estimatedMinutes;
  if (typeof payload.status !== "undefined") patch.status = payload.status;
  if (typeof payload.priority !== "undefined") patch.priority = payload.priority;
  if (typeof payload.category !== "undefined") patch.category = payload.category;
  if (typeof payload.togglProjectId !== "undefined") patch.togglProjectId = payload.togglProjectId;
  if (typeof completedOnDate !== "undefined") patch.completedOnDate = completedOnDate;

  const task = await context.repository.updateTask(payload.taskId, patch, context.client);

  const estimatedMinutesChanged = typeof payload.estimatedMinutes !== "undefined"
    && payload.estimatedMinutes !== currentTask.estimatedMinutes;
  const shouldResizeScheduledBlock = estimatedMinutesChanged
    && (currentTask.scheduledBlockId !== null || currentTask.status === "scheduled");

  if (shouldResizeScheduledBlock) {
    const scheduledBlock = currentTask.scheduledBlockId
      ? await context.repository.getScheduleBlock(currentTask.scheduledBlockId, context.client)
      : null;
    const existingBlock = scheduledBlock ?? await context.repository.getScheduleBlockByTaskId(currentTask.id, context.client);

    if (existingBlock) {
      const nextEndAt = new Date(
        new Date(existingBlock.startAt).getTime() + task.estimatedMinutes * 60_000,
      ).toISOString();

      await updateScheduleBlockWithValidation(context, {
        existingBlock,
        patch: {
          endAt: nextEndAt,
          plannerDate: payload.plannerDate,
          tzOffsetMinutes: payload.tzOffsetMinutes,
        },
      });
    }
  }

  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "task",
      entityId: task.id,
      diffSummary: context.draft.diffSummary,
      payload: { ...context.draft.payload, taskTitle: task.title },
    },
    context.client,
  );
  await queueGoogleTaskStatusSync(context, task.id, payload);
  return context.markApplied();
}

export async function applyTaskDeleteDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as { taskId: string };
  const task = await context.repository.getTask(payload.taskId, context.client);
  if (!task) {
    throw notFound(`Task ${payload.taskId} not found`);
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
      googleTaskId: existingBlock.googleTaskId ?? null,
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
      payload: { ...context.draft.payload, taskTitle: task.title },
    },
    context.client,
  );
  return context.markApplied();
}
