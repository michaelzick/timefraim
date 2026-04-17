import type {
  ScheduleBlockSource,
  Task,
  TogglProjectOption,
  TogglWorkspaceOption,
} from "@timefraim/shared";
import { getStringId, togglRequest } from "./toggl-track-client.js";

export { discoverTogglData, getTogglProfile, listTogglProjects, listTogglWorkspaces, validateTogglConnection } from "./toggl-track-catalog.js";

export type TogglConnection = {
  apiToken: string;
  apiTokenHint: string;
  workspaceId: string;
  workspaceName: string;
  defaultProjectId: string | null;
  defaultProjectName: string | null;
  availableWorkspaces: TogglWorkspaceOption[];
  availableProjects: TogglProjectOption[];
  lastValidatedAt: string | null;
};

export type TogglStartResult = {
  togglEntryId: string | null;
};

function getEntryId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("id" in payload) {
    return getStringId(payload.id);
  }

  if ("data" in payload && typeof payload.data === "object" && payload.data !== null && "id" in payload.data) {
    return getStringId(payload.data.id);
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

  const projectId = params.task.togglProjectId ?? params.connection.defaultProjectId ?? undefined;
  const payload = await togglRequest<unknown>(
    `/workspaces/${encodeURIComponent(params.connection.workspaceId)}/time_entries`,
    params.connection.apiToken,
    {
      method: "POST",
      body: JSON.stringify({
        created_with: "TimeFraim",
        description: params.task.title,
        duration: -1,
        start: new Date().toISOString(),
        stop: null,
        workspace_id: Number(params.connection.workspaceId),
        project_id: projectId ? Number(projectId) : undefined,
        tags: ["timefraim"],
      }),
    },
  );

  return { togglEntryId: getEntryId(payload) };
}

export async function startTogglTimerForEvent(params: {
  connection: TogglConnection | null;
  eventTitle: string;
  source: ScheduleBlockSource;
  togglProjectId?: string | null;
}): Promise<TogglStartResult> {
  if (!params.connection) {
    return { togglEntryId: null };
  }

  const projectId = params.togglProjectId ?? params.connection.defaultProjectId ?? undefined;
  const payload = await togglRequest<unknown>(
    `/workspaces/${encodeURIComponent(params.connection.workspaceId)}/time_entries`,
    params.connection.apiToken,
    {
      method: "POST",
      body: JSON.stringify({
        created_with: "TimeFraim",
        description: params.eventTitle,
        duration: -1,
        start: new Date().toISOString(),
        stop: null,
        workspace_id: Number(params.connection.workspaceId),
        project_id: projectId ? Number(projectId) : undefined,
        tags: ["timefraim"],
      }),
    },
  );

  return { togglEntryId: getEntryId(payload) };
}

export async function stopTogglTimer(
  connection: TogglConnection | null,
  togglEntryId: string | null | undefined,
): Promise<void> {
  if (!connection || !togglEntryId) {
    return;
  }

  await togglRequest(
    `/workspaces/${encodeURIComponent(connection.workspaceId)}/time_entries/${encodeURIComponent(togglEntryId)}/stop`,
    connection.apiToken,
    { method: "PATCH" },
  );
}
