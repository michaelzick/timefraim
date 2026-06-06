import type { TogglIntegrationSettings } from "@timefraim/shared";

export type TogglProjectOption = { id: string; name: string };

// Shared between the Planner inbox and the Board create-task panel so the two
// task-creation forms present identical Toggl guidance.
export function getDefaultTogglProjectLabel(togglSettings: TogglIntegrationSettings): string {
  if (!togglSettings.connected) {
    return "Connect Toggl in Settings to assign a project";
  }

  if (togglSettings.defaultProjectName) {
    return `Use workspace default (${togglSettings.defaultProjectName})`;
  }

  return "Without project";
}

export function getTogglProjectHelperText(togglSettings: TogglIntegrationSettings): string {
  return togglSettings.connected
    ? `Timers for this task will run in ${togglSettings.workspaceName ?? "your saved Toggl workspace"}.`
    : "Connect Toggl from Settings to choose a project per task.";
}

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
