import type { ScheduleBlock, ScheduleBlockUpdate } from "@timefraim/shared";
import { detectScheduleConflicts } from "./planner-domain.js";
import { endOfDay, startOfDay } from "../utils/date.js";
import { isUniqueViolation, type DraftHandlerContext } from "./planner-service-types.js";

type ScheduleBlockMutationContext = Pick<
  DraftHandlerContext,
  "client" | "googleConnected" | "repository" | "sideEffects"
>;

export async function updateScheduleBlockWithValidation(
  context: ScheduleBlockMutationContext,
  params: {
    existingBlock: ScheduleBlock;
    patch: Pick<ScheduleBlockUpdate, "startAt" | "endAt" | "source">;
  },
) {
  const nextStartAt = params.patch.startAt ?? params.existingBlock.startAt;
  const nextEndAt = params.patch.endAt ?? params.existingBlock.endAt;
  const range = {
    startAt: startOfDay(nextStartAt.slice(0, 10)).toISOString(),
    endAt: endOfDay(nextStartAt.slice(0, 10)).toISOString(),
  };
  const [blocks, events] = await Promise.all([
    context.repository.listScheduleBlocksForRange(range, context.client),
    context.repository.listCalendarEventsForRange(range, context.client),
  ]);
  const conflicts = detectScheduleConflicts({
    candidateStartAt: nextStartAt,
    candidateEndAt: nextEndAt,
    scheduleBlocks: blocks,
    calendarEvents: events,
    ignoreScheduleBlockId: params.existingBlock.id,
  });
  if (conflicts.length > 0) {
    throw new Error(`Schedule conflict with ${conflicts[0].title}`);
  }

  const block = await context.repository.updateScheduleBlock(
    params.existingBlock.id,
    {
      startAt: params.patch.startAt,
      endAt: params.patch.endAt,
      source: params.patch.source,
      state: context.googleConnected ? "sync_pending" : "confirmed",
    },
    context.client,
  );
  context.sideEffects.push({ type: "google.upsert", taskId: block.taskId, scheduleBlockId: block.id });
  return block;
}

export async function applyScheduleBlockCreateDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as {
    taskId: string;
    startAt: string;
    endAt: string;
    source: "manual" | "ai" | "sync";
  };
  const task = await context.repository.getTask(payload.taskId, context.client);
  if (!task) {
    throw new Error(`Task ${payload.taskId} not found`);
  }

  const scheduledBlock = task.scheduledBlockId
    ? await context.repository.getScheduleBlock(task.scheduledBlockId, context.client)
    : null;
  const existingBlock = scheduledBlock ?? (await context.repository.getScheduleBlockByTaskId(task.id, context.client));
  if (existingBlock) {
    throw new Error("Task is already scheduled");
  }

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

  let block;
  try {
    block = await context.repository.createScheduleBlock(
      {
        taskId: payload.taskId,
        startAt: payload.startAt,
        endAt: payload.endAt,
        source: payload.source,
        state: context.googleConnected ? "sync_pending" : "confirmed",
      },
      context.client,
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Task is already scheduled");
    }
    throw error;
  }

  await context.repository.updateTask(task.id, { scheduledBlockId: block.id, status: "scheduled" }, context.client);
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "schedule_block",
      entityId: block.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  context.sideEffects.push({ type: "google.upsert", taskId: task.id, scheduleBlockId: block.id });
  return context.markApplied();
}

export async function applyScheduleBlockUpdateDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as ScheduleBlockUpdate;
  const existingBlock = await context.repository.getScheduleBlock(payload.scheduleBlockId, context.client);
  if (!existingBlock) {
    throw new Error(`Schedule block ${payload.scheduleBlockId} not found`);
  }

  const block = await updateScheduleBlockWithValidation(context, {
    existingBlock,
    patch: {
      startAt: payload.startAt,
      endAt: payload.endAt,
      source: payload.source,
    },
  });
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "schedule_block",
      entityId: block.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  return context.markApplied();
}

export async function applyScheduleBlockDeleteDraft(context: DraftHandlerContext) {
  const payload = context.draft.payload as { scheduleBlockId: string };
  const existingBlock = await context.repository.getScheduleBlock(payload.scheduleBlockId, context.client);
  if (!existingBlock) {
    throw new Error(`Schedule block ${payload.scheduleBlockId} not found`);
  }

  const task = await context.repository.getTask(existingBlock.taskId, context.client);
  await context.repository.deleteCalendarEventByScheduleBlockId(existingBlock.id, context.client);
  await context.repository.deleteScheduleBlock(existingBlock.id, context.client);
  if (task?.scheduledBlockId === existingBlock.id) {
    await context.repository.updateTask(
      task.id,
      {
        scheduledBlockId: null,
        status: task.status === "done" ? "done" : "planned",
      },
      context.client,
    );
  }
  await context.repository.createAuditLog(
    {
      actorRole: context.actorRole,
      action: context.draft.kind,
      entityType: "schedule_block",
      entityId: existingBlock.id,
      diffSummary: context.draft.diffSummary,
      payload: context.draft.payload,
    },
    context.client,
  );
  context.sideEffects.push({
    type: "google.delete",
    googleEventId: existingBlock.googleEventId ?? null,
    scheduleBlockId: existingBlock.id,
  });
  return context.markApplied();
}
