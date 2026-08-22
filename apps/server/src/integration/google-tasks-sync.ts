import type { GoogleConnection } from "./google-api-client.ts";
import type { GoogleTaskResource, GoogleTasksListResponse } from "./google-api-types.ts";
import { createGoogleTasksClient, googleTasksUrl } from "./google-tasks.ts";

export type GoogleScheduledTaskRecord = {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  due: string | null;
  updated: string | null;
  completed: string | null;
  deleted: boolean;
  hidden: boolean;
};

function mapGoogleScheduledTask(item: GoogleTaskResource): GoogleScheduledTaskRecord | null {
  if (!item.id || (item.status !== "needsAction" && item.status !== "completed")) {
    return null;
  }

  return {
    id: item.id,
    title: item.title ?? "",
    status: item.status,
    due: item.due ?? null,
    updated: item.updated ?? null,
    completed: item.completed ?? null,
    deleted: item.deleted === true,
    hidden: item.hidden === true,
  };
}

export async function listGoogleScheduledTasks(params: {
  connection: GoogleConnection | null;
  dueMin: string;
  dueMax: string;
  updatedMin?: string | null;
}): Promise<GoogleScheduledTaskRecord[]> {
  const tasks = createGoogleTasksClient(params.connection);
  if (!tasks) {
    return [];
  }

  const records: GoogleScheduledTaskRecord[] = [];
  let pageToken: string | undefined;

  do {
    const response = await tasks.request<GoogleTasksListResponse>(
      "GET",
      googleTasksUrl(undefined, {
        dueMin: params.dueMin,
        dueMax: params.dueMax,
        maxResults: 100,
        pageToken,
        showCompleted: true,
        showDeleted: false,
        showHidden: true,
        updatedMin: params.updatedMin ?? undefined,
      }),
    );

    records.push(
      ...(response.items ?? [])
        .map((item) => mapGoogleScheduledTask(item))
        .filter((item): item is GoogleScheduledTaskRecord => Boolean(item)),
    );
    pageToken = response.nextPageToken ?? undefined;
  } while (pageToken);

  return records;
}

function isMissingGoogleTask(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown; status?: unknown }).code
    ?? (error as { code?: unknown; status?: unknown }).status;
  return code === 404 || code === 410;
}

export async function getGoogleScheduledTasksByIds(params: {
  connection: GoogleConnection | null;
  taskIds: string[];
}): Promise<GoogleScheduledTaskRecord[]> {
  const tasks = createGoogleTasksClient(params.connection);
  if (!tasks || params.taskIds.length === 0) {
    return [];
  }

  const records: GoogleScheduledTaskRecord[] = [];
  for (const taskId of [...new Set(params.taskIds)]) {
    try {
      const response = await tasks.request<GoogleTaskResource>("GET", googleTasksUrl(taskId));
      const record = mapGoogleScheduledTask(response);
      if (record) {
        records.push(record);
      }
    } catch (error) {
      if (!isMissingGoogleTask(error)) {
        throw error;
      }
    }
  }

  return records;
}
