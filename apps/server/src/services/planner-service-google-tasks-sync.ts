import type { TaskStatus } from "@timefraim/shared";
import { pool } from "../db/pool.js";
import type { GoogleConnection } from "../integration/google-calendar.js";
import { upsertGoogleScheduledTask } from "../integration/google-tasks.js";
import { getGoogleScheduledTasksByIds, type GoogleScheduledTaskRecord } from "../integration/google-tasks-sync.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";

function isAfter(value: string | null, reference: string) {
  return value ? new Date(value).getTime() > new Date(reference).getTime() : false;
}

function completedOnDate(record: GoogleScheduledTaskRecord) {
  return record.completed?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
}

function statusForGoogleTask(record: GoogleScheduledTaskRecord, isScheduled: boolean): TaskStatus {
  if (record.status === "completed") {
    return "done";
  }
  return isScheduled ? "scheduled" : "planned";
}

export async function syncGoogleTaskCompletionStatuses(args: {
  repository: PlannerRepository;
  connection: GoogleConnection | null;
  range: { startAt: string; endAt: string };
}) {
  const blocks = await args.repository.listScheduleBlocksWithGoogleTaskIdsForRange(args.range, pool);
  const googleTaskIds = blocks.flatMap((block) => block.googleTaskId ? [block.googleTaskId] : []);
  if (googleTaskIds.length === 0) {
    return;
  }
  const records = await getGoogleScheduledTasksByIds({ connection: args.connection, taskIds: googleTaskIds });
  const activeRecords = records.filter((record) => !record.deleted);
  if (activeRecords.length === 0) {
    return;
  }

  const blockByGoogleTaskId = new Map(
    blocks.flatMap((block) => block.googleTaskId ? [[block.googleTaskId, block]] : []),
  );

  for (const record of activeRecords) {
    const block = blockByGoogleTaskId.get(record.id);
    if (!block) {
      continue;
    }
    const task = await args.repository.getTask(block.taskId, pool);
    if (!task) {
      continue;
    }

    const nextStatus = statusForGoogleTask(record, task.scheduledBlockId === block.id);
    if (task.status === nextStatus) {
      continue;
    }
    if (!isAfter(record.updated, task.updatedAt)) {
      await upsertGoogleScheduledTask({ connection: args.connection, task, block });
      continue;
    }

    await args.repository.updateTask(
      task.id,
      {
        status: nextStatus,
        completedOnDate: nextStatus === "done" ? completedOnDate(record) : null,
      },
      pool,
    );
  }
}
