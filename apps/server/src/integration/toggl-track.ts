import type { ScheduleBlockSource, Task } from "@timefraim/shared";

export type TogglConnection = {
  apiToken: string;
  workspaceId: string;
  defaultProjectId: string | null;
};

export type TogglStartResult = {
  togglEntryId: string | null;
};

function getAuthHeader(apiToken: string): string {
  return `Basic ${Buffer.from(`${apiToken}:api_token`).toString("base64")}`;
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown> | null> {
  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as Record<string, unknown>;
}

function getEntryId(payload: Record<string, unknown> | null) {
  if (!payload) {
    return null;
  }

  if (typeof payload.id === "string" || typeof payload.id === "number") {
    return `${payload.id}`;
  }

  const nestedPayload = payload.data;
  if (typeof nestedPayload === "object" && nestedPayload !== null && "id" in nestedPayload) {
    const id = nestedPayload.id;
    return typeof id === "string" || typeof id === "number" ? `${id}` : null;
  }

  return null;
}

export async function startTogglTimer(params: {
  connection: TogglConnection | null;
  task: Task;
  source: ScheduleBlockSource;
}): Promise<TogglStartResult> {
  if (!params.connection) {
    return { togglEntryId: null };
  }

  const response = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${params.connection.workspaceId}/time_entries`,
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(params.connection.apiToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        created_with: "TimeFraim",
        description: params.task.title,
        duration: -1,
        start: new Date().toISOString(),
        stop: null,
        workspace_id: Number(params.connection.workspaceId),
        project_id: params.task.togglProjectId
          ? Number(params.task.togglProjectId)
          : params.connection.defaultProjectId
            ? Number(params.connection.defaultProjectId)
            : undefined,
        tags: ["timefraim", params.source],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Toggl start failed with status ${response.status}`);
  }

  const payload = await parseJsonResponse(response);
  return {
    togglEntryId: getEntryId(payload),
  };
}

export async function stopTogglTimer(
  connection: TogglConnection | null,
  togglEntryId: string | null | undefined,
): Promise<void> {
  if (!connection || !togglEntryId) {
    return;
  }

  const response = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${connection.workspaceId}/time_entries/${togglEntryId}/stop`,
    {
      method: "PATCH",
      headers: {
        Authorization: getAuthHeader(connection.apiToken),
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Toggl stop failed with status ${response.status}`);
  }
}
