import { createGoogleTasksClient } from "./google-tasks.js";
import type { GoogleConnection } from "./google-calendar.js";

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

function mapGoogleScheduledTask(item: {
  id?: string | null;
  title?: string | null;
  status?: string | null;
  due?: string | null;
  updated?: string | null;
  completed?: string | null;
  deleted?: boolean | null;
  hidden?: boolean | null;
}): GoogleScheduledTaskRecord | null {
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
    const response = await tasks.tasks.list({
      tasklist: "@default",
      dueMin: params.dueMin,
      dueMax: params.dueMax,
      maxResults: 100,
      pageToken,
      showCompleted: true,
      showDeleted: false,
      showHidden: true,
      updatedMin: params.updatedMin ?? undefined,
    });

    records.push(
      ...(response.data.items ?? [])
        .map((item) => mapGoogleScheduledTask(item))
        .filter((item): item is GoogleScheduledTaskRecord => Boolean(item)),
    );
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return records;
}
