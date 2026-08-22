import type { TaskStatus } from "@timefraim/shared";
import { pool } from "../db/pool.ts";
import type { GoogleConnection } from "../integration/google-calendar.ts";
import { upsertGoogleScheduledTask } from "../integration/google-tasks.ts";
import { getGoogleScheduledTasksByIds, type GoogleScheduledTaskRecord } from "../integration/google-tasks-sync.ts";
import type { PlannerRepository } from "../repositories/planner-repository.ts";

function isAfter(value: string | null, reference: string) {
  return value ? new Date(value).getTime() > new Date(reference).getTime() : false;
}

function toLocalIsoDate(instant: string, tzOffsetMinutes: number) {
  return new Date(new Date(instant).getTime() - tzOffsetMinutes * 60000).toISOString().slice(0, 10);
}

function completedOnDate(record: GoogleScheduledTaskRecord, tzOffsetMinutes: number) {
  return toLocalIsoDate(record.completed ?? new Date().toISOString(), tzOffsetMinutes);
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
  tzOffsetMinutes: number;
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
    // Push local status back to Google only when the local task is strictly newer;
    // ties, clock skew, and a missing Google timestamp must not revert a user's
    // Google-side change (e.g. silently un-completing a task they just checked off).
    if (record.updated !== null && isAfter(task.updatedAt, record.updated)) {
      await upsertGoogleScheduledTask({ connection: args.connection, task, block });
      continue;
    }

    await args.repository.updateTask(
      task.id,
      {
        status: nextStatus,
        completedOnDate: nextStatus === "done" ? completedOnDate(record, args.tzOffsetMinutes) : null,
      },
      pool,
    );
  }
}
