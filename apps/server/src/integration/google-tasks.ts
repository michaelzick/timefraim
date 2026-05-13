import type { ScheduleBlock, Task } from "@timefraim/shared";
import { google } from "googleapis";
import type { GoogleConnection } from "./google-calendar.js";
import { getGoogleOAuthClient } from "./google-auth.js";

function toGoogleTaskDue(plannerDate: string | null | undefined) {
  return plannerDate ? `${plannerDate}T00:00:00.000Z` : undefined;
}

function createGoogleTasksClient(connection: GoogleConnection | null) {
  if (!connection) {
    return null;
  }

  const auth = getGoogleOAuthClient(connection);
  return auth ? google.tasks({ version: "v1", auth }) : null;
}

export async function upsertGoogleScheduledTask(params: {
  connection: GoogleConnection | null;
  task: Task;
  block: ScheduleBlock;
}): Promise<string | null> {
  const tasks = createGoogleTasksClient(params.connection);
  if (!tasks) {
    return null;
  }

  const requestBody = {
    title: params.task.title,
    notes: params.task.notes ?? undefined,
    status: params.task.status === "done" ? ("completed" as const) : ("needsAction" as const),
    due: toGoogleTaskDue(params.block.startAt.slice(0, 10)),
  };

  if (params.block.googleTaskId) {
    await tasks.tasks.patch({
      tasklist: "@default",
      task: params.block.googleTaskId,
      requestBody,
    });
    return params.block.googleTaskId;
  }

  const response = await tasks.tasks.insert({
    tasklist: "@default",
    requestBody,
  });

  return response.data.id ?? null;
}

export async function deleteGoogleTask(
  connection: GoogleConnection | null,
  googleTaskId: string | null | undefined,
): Promise<void> {
  if (!googleTaskId) {
    return;
  }

  const tasks = createGoogleTasksClient(connection);
  if (!tasks) {
    return;
  }

  await tasks.tasks.delete({
    tasklist: "@default",
    task: googleTaskId,
  });
}
