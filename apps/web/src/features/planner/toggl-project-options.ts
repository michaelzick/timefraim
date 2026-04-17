import type { TogglIntegrationSettings } from "@timefraim/shared";

export type TogglProjectOption = { id: string; name: string };

export function getTogglProjectOptions(
  togglSettings: TogglIntegrationSettings,
  currentProjectId: string | null,
): TogglProjectOption[] {
  const options = togglSettings.availableProjects.filter((project) =>
    togglSettings.workspaceId ? project.workspaceId === togglSettings.workspaceId : true,
  );

  if (currentProjectId && !options.some((project) => project.id === currentProjectId)) {
    return [
      { id: currentProjectId, name: `Missing project (ID ${currentProjectId})` },
      ...options.map((project) => ({ id: project.id, name: project.name })),
    ];
  }

  return options.map((project) => ({ id: project.id, name: project.name }));
}
