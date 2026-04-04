import type { ScheduleBlockSource, Task } from "@schejewel/shared";

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
        created_with: "Schejewel",
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
        tags: ["schejewel", params.source],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Toggl start failed with status ${response.status}`);
  }

  const payload = await parseJsonResponse(response);
  return {
    togglEntryId:
      payload && typeof payload.id !== "undefined" ? String(payload.id) : payload?.data ? String((payload.data as { id?: string | number }).id ?? "") : null,
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
