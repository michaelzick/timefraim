import type {
  TogglProjectOption,
  TogglWorkspaceOption,
} from "@timefraim/shared";
import type { UseFormRegister } from "react-hook-form";
import type { TogglFormValues } from "@/pages/settings-toggl-sections";

export function SettingsTogglCatalogFields({
  needsFreshCatalog,
  projectOptions,
  register,
  watchedWorkspaceId,
  workspaceOptions,
}: {
  needsFreshCatalog: boolean;
  projectOptions: TogglProjectOption[];
  register: UseFormRegister<TogglFormValues>;
  watchedWorkspaceId: string;
  workspaceOptions: TogglWorkspaceOption[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <select
        aria-label="Toggl workspace"
        className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)]"
        {...register("workspaceId")}
      >
        <option value="" className="bg-[var(--panel)]">
          {workspaceOptions.length
            ? "Choose a workspace"
            : "Discover a workspace first"}
        </option>
        {workspaceOptions.map((workspace) => (
          <option key={workspace.id} value={workspace.id} className="bg-[var(--panel)]">
            {workspace.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Toggl default project"
        className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!watchedWorkspaceId}
        {...register("defaultProjectId")}
      >
        <option value="" className="bg-[var(--panel)]">
          {needsFreshCatalog
            ? "Refresh catalog after changing workspace"
            : projectOptions.length
              ? "No workspace default project"
              : "No saved projects for this workspace"}
        </option>
        {projectOptions.map((project) => (
          <option key={project.id} value={project.id} className="bg-[var(--panel)]">
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
