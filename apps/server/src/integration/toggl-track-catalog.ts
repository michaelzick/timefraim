import type { TogglDiscoverResult, TogglProjectOption, TogglWorkspaceOption } from "@timefraim/shared";
import { getStringId, togglRequest } from "./toggl-track-client.js";

type TogglWorkspaceResponse = {
  id?: string | number;
  name?: string;
};

type TogglProjectResponse = {
  id?: string | number;
  name?: string;
  workspace_id?: string | number;
  wid?: string | number;
  active?: boolean;
};

function normalizeWorkspace(record: TogglWorkspaceResponse): TogglWorkspaceOption | null {
  const id = getStringId(record.id);
  if (!id || typeof record.name !== "string" || record.name.length === 0) {
    return null;
  }

  return { id, name: record.name };
}

function normalizeProject(record: TogglProjectResponse): TogglProjectOption | null {
  const id = getStringId(record.id);
  const workspaceId = getStringId(record.workspace_id ?? record.wid);
  if (!id || !workspaceId || typeof record.name !== "string" || record.name.length === 0) {
    return null;
  }

  return {
    id,
    name: record.name,
    workspaceId,
    active: record.active ?? true,
  };
}

function normalizeWorkspaceList(payload: unknown): TogglWorkspaceOption[] {
  const items =
    typeof payload === "object" && payload !== null && "items" in payload && Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  return items
    .map((item) => normalizeWorkspace((item ?? {}) as TogglWorkspaceResponse))
    .filter((item): item is TogglWorkspaceOption => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeProjectList(payload: unknown): TogglProjectOption[] {
  const items =
    typeof payload === "object" && payload !== null && "items" in payload && Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  return items
    .map((item) => normalizeProject((item ?? {}) as TogglProjectResponse))
    .filter((item): item is TogglProjectOption => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listTogglWorkspaces(apiToken: string) {
  return normalizeWorkspaceList(await togglRequest<unknown>("/me/workspaces", apiToken));
}

export async function getTogglProfile(apiToken: string) {
  const payload = await togglRequest<Record<string, unknown>>("/me", apiToken);
  return {
    defaultWorkspaceId: getStringId(payload.default_workspace_id),
  };
}

export async function listTogglProjects(apiToken: string, workspaceId: string) {
  const encodedWorkspaceId = encodeURIComponent(workspaceId);
  return normalizeProjectList(
    await togglRequest<unknown>(`/workspaces/${encodedWorkspaceId}/projects?active=true`, apiToken),
  );
}

function resolveSelectedWorkspace(
  workspaces: TogglWorkspaceOption[],
  requestedWorkspaceId: string | null | undefined,
  defaultWorkspaceId: string | null,
) {
  if (requestedWorkspaceId) {
    return workspaces.find((workspace) => workspace.id === requestedWorkspaceId) ?? null;
  }

  if (defaultWorkspaceId) {
    return workspaces.find((workspace) => workspace.id === defaultWorkspaceId) ?? null;
  }

  return workspaces[0] ?? null;
}

export async function discoverTogglData(input: {
  apiToken: string;
  apiTokenHint: string;
  workspaceId?: string | null;
}): Promise<TogglDiscoverResult> {
  const [profile, workspaces] = await Promise.all([
    getTogglProfile(input.apiToken),
    listTogglWorkspaces(input.apiToken),
  ]);
  const selectedWorkspace = resolveSelectedWorkspace(workspaces, input.workspaceId, profile.defaultWorkspaceId);
  const projects = selectedWorkspace ? await listTogglProjects(input.apiToken, selectedWorkspace.id) : [];

  return {
    apiTokenHint: input.apiTokenHint,
    selectedWorkspaceId: selectedWorkspace?.id ?? null,
    selectedWorkspaceName: selectedWorkspace?.name ?? null,
    defaultProjectId: null,
    defaultProjectName: null,
    availableWorkspaces: workspaces,
    availableProjects: projects,
  };
}

export async function validateTogglConnection(input: {
  apiToken: string;
  apiTokenHint: string;
  workspaceId: string;
  defaultProjectId: string | null;
}) {
  const discovered = await discoverTogglData({
    apiToken: input.apiToken,
    apiTokenHint: input.apiTokenHint,
    workspaceId: input.workspaceId,
  });

  if (!discovered.selectedWorkspaceId || discovered.selectedWorkspaceId !== input.workspaceId) {
    throw new Error("Selected Toggl workspace was not found for this token");
  }

  const defaultProject = input.defaultProjectId
    ? discovered.availableProjects.find((project) => project.id === input.defaultProjectId) ?? null
    : null;

  if (input.defaultProjectId && !defaultProject) {
    throw new Error("Selected Toggl default project was not found in the chosen workspace");
  }

  return {
    apiTokenHint: input.apiTokenHint,
    workspaceId: discovered.selectedWorkspaceId,
    workspaceName: discovered.selectedWorkspaceName ?? "Unknown workspace",
    defaultProjectId: defaultProject?.id ?? null,
    defaultProjectName: defaultProject?.name ?? null,
    availableWorkspaces: discovered.availableWorkspaces,
    availableProjects: discovered.availableProjects,
    lastValidatedAt: new Date().toISOString(),
  };
}
