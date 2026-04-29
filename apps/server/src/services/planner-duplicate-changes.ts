import type { ScheduleBlockDuplicatePayload, TaskDuplicatePayload } from "@timefraim/shared";
import { detectScheduleConflicts } from "./planner-domain.js";
import { endOfDay, startOfDay } from "../utils/date.js";
import { isUniqueViolation, type DraftHandlerContext } from "./planner-service-types.js";

export type DuplicateOutcome = {
  createdTaskId: string | null;
  createdScheduleBlockId: string | null;
};

export async function duplicateTaskInContext(context: DraftHandlerContext): Promise<DuplicateOutcome> {
  const payload = context.draft.payload as TaskDuplicatePayload;
  const sourceTask = await context.repository.getTask(payload.sourceTaskId, context.client);
  if (!sourceTask) {
    throw new Error(`Task ${payload.sourceTaskId} not found`);
  }

  const newTask = await context.repository.createTask(
    {
      title: sourceTask.title,
      notes: sourceTask.notes ?? null,
      estimatedMinutes: sourceTask.estimatedMinutes,
      status: "planned",
      priority: sourceTask.priority,
      togglProjectId: sourceTask.togglProjectId ?? null,
    },
    context.client,
  );

  let createdScheduleBlockId: string | null = null;

  if (payload.startAt && payload.endAt) {
    const range = {
      startAt: startOfDay(payload.startAt.slice(0, 10)).toISOString(),
      endAt: endOfDay(payload.startAt.slice(0, 10)).toISOString(),
    };
    const [blocks, events] = await Promise.all([
      context.repository.listScheduleBlocksForRange(range, context.client),
      context.repository.listCalendarEventsForRange(range, context.client),
    ]);
    const conflicts = detectScheduleConflicts({
      candidateStartAt: payload.startAt,
      candidateEndAt: payload.endAt,
      scheduleBlocks: blocks,
      calendarEvents: events,
    });
    if (conflicts.length > 0) {
      throw new Error(`Schedule conflict with ${conflicts[0].title}`);
    }

    try {
      const block = await context.repository.createScheduleBlock(
        {
          taskId: newTask.id,
          startAt: payload.startAt,
          endAt: payload.endAt,
          source: "manual",
          state: context.syncPlannerBlocksToCalendar ? "sync_pending" : "confirmed",
        },
        context.client,
      );
      await context.repository.updateTask(
        newTask.id,
        { scheduledBlockId: block.id, status: "scheduled" },
        context.client,
      );
      if (context.syncPlannerBlocksToCalendar) {
        context.sideEffects.push({ type: "google.upsert", taskId: newTask.id, scheduleBlockId: block.id });
      }
      createdScheduleBlockId = block.id;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("Task is already scheduled");
      }
      throw error;
    }
  } else if (context.googleConnected) {
    context.sideEffects.push({
      type: "google.task.create",
      taskId: newTask.id,
      plannerDate: payload.plannerDate ?? null,
    });
  }

  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "task",
      entityId: newTask.id,
      diffSummary: context.draft.diffSummary,
      payload: {
        ...context.draft.payload,
        sourceTaskTitle: sourceTask.title,
        taskTitle: newTask.title,
      },
    },
    context.client,
  );

  return { createdTaskId: newTask.id, createdScheduleBlockId };
}

export async function duplicateScheduleBlockInContext(
  context: DraftHandlerContext,
): Promise<DuplicateOutcome> {
  const payload = context.draft.payload as ScheduleBlockDuplicatePayload;
  const sourceBlock = await context.repository.getScheduleBlock(payload.sourceBlockId, context.client);
  if (!sourceBlock) {
    throw new Error(`Schedule block ${payload.sourceBlockId} not found`);
  }
  const task = await context.repository.getTask(sourceBlock.taskId, context.client);

  const range = {
    startAt: startOfDay(payload.startAt.slice(0, 10)).toISOString(),
    endAt: endOfDay(payload.startAt.slice(0, 10)).toISOString(),
  };
  const [blocks, events] = await Promise.all([
    context.repository.listScheduleBlocksForRange(range, context.client),
    context.repository.listCalendarEventsForRange(range, context.client),
  ]);
  const conflicts = detectScheduleConflicts({
    candidateStartAt: payload.startAt,
    candidateEndAt: payload.endAt,
    scheduleBlocks: blocks,
    calendarEvents: events,
  });
  if (conflicts.length > 0) {
    throw new Error(`Schedule conflict with ${conflicts[0].title}`);
  }

  const block = await context.repository.createScheduleBlock(
    {
      taskId: sourceBlock.taskId,
      startAt: payload.startAt,
      endAt: payload.endAt,
      source: "manual",
      state: context.syncPlannerBlocksToCalendar ? "sync_pending" : "confirmed",
    },
    context.client,
  );
  if (context.syncPlannerBlocksToCalendar) {
    context.sideEffects.push({ type: "google.upsert", taskId: sourceBlock.taskId, scheduleBlockId: block.id });
  }

  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "schedule_block",
      entityId: block.id,
      diffSummary: context.draft.diffSummary,
      payload: { ...context.draft.payload, taskTitle: task?.title ?? null },
    },
    context.client,
  );

  return { createdTaskId: null, createdScheduleBlockId: block.id };
}

export async function applyTaskDuplicateDraft(context: DraftHandlerContext) {
  await duplicateTaskInContext(context);
  return context.markApplied();
}

export async function applyScheduleBlockDuplicateDraft(context: DraftHandlerContext) {
  await duplicateScheduleBlockInContext(context);
  return context.markApplied();
}
