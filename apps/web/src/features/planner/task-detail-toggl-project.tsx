import type { Task, TogglIntegrationSettings } from "@timefraim/shared";
import type { UseFormReturn } from "react-hook-form";
import { getTogglProjectOptions } from "@/features/planner/toggl-project-options";
import type { TaskFormValues } from "@/features/planner/types";

export function TaskDetailTogglProject({
  form,
  selectedTask,
  togglSettings,
}: {
  form: UseFormReturn<TaskFormValues>;
  selectedTask: Task;
  togglSettings: TogglIntegrationSettings;
}) {
  const projectOptions = getTogglProjectOptions(togglSettings, selectedTask.togglProjectId ?? null);
  return (
    <div className="space-y-2">
      <select
        aria-label="Detail Toggl project"
        className="h-11 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!togglSettings.connected}
        {...form.register("togglProjectId")}
      >
        <option value="">
          {togglSettings.defaultProjectName
            ? `Use workspace default (${togglSettings.defaultProjectName})`
            : togglSettings.connected
              ? "Without project"
              : "Connect Toggl in Settings to assign a project"}
        </option>
        {projectOptions.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-[var(--muted)]">
        {!togglSettings.connected
          ? "Connect Toggl in Settings to edit per-task project mapping."
          : selectedTask.togglProjectId && projectOptions[0]?.id === selectedTask.togglProjectId && projectOptions[0]?.name.startsWith("Missing project")
            ? "This task still references a Toggl project that is no longer in the current workspace catalog."
            : `This task will start timers in ${togglSettings.workspaceName ?? "your saved Toggl workspace"}.`}
      </p>
    </div>
  );
}
