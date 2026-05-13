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

export async function assertGoogleTasksAccess(connection: GoogleConnection | null): Promise<void> {
  const tasks = createGoogleTasksClient(connection);
  if (!tasks) {
    return;
  }

  await tasks.tasklists.get({
    tasklist: "@default",
  });
}

export function getGoogleTasksAccessErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to access Google Tasks";
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("has not been used") || lowerMessage.includes("disabled")) {
    return "Google Tasks API is not enabled for this Google Cloud project. Enable tasks.googleapis.com, then save this setting again.";
  }
  if (lowerMessage.includes("insufficient authentication scopes")) {
    return "Google Tasks access is missing from the current Google session. Sign out, sign in again, and approve Google Tasks access.";
  }
  return `Unable to access Google Tasks: ${message}`;
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
