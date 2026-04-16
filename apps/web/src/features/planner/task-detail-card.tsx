import type { Task, TogglIntegrationSettings } from "@timefraim/shared";
import { Play, Square, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PRIORITY_OPTIONS,
  TASK_LIFECYCLE_OPTIONS,
  formatTaskLifecycle,
  formatTaskPriority,
  getTaskPriorityBadgeClass,
} from "@/features/planner/task-presentation";
import type { TaskFormValues } from "@/features/planner/types";

type TaskDetailCardProps = {
  detailPanelRef: RefObject<HTMLDivElement | null>;
  form: UseFormReturn<TaskFormValues>;
  selectedTask: Task | null;
  activeTimerTaskId: string | null;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  onDeleteTask: () => void;
  onSaveTask: (values: TaskFormValues) => Promise<unknown>;
  onStartTimer: (taskId: string) => void;
  onStopTimer: () => void;
};

function getProjectOptions(togglSettings: TogglIntegrationSettings, selectedTask: Task | null) {
  const options = togglSettings.availableProjects.filter((project) =>
    togglSettings.workspaceId ? project.workspaceId === togglSettings.workspaceId : true,
  );
  const currentProjectId = selectedTask?.togglProjectId ?? null;

  if (currentProjectId && !options.some((project) => project.id === currentProjectId)) {
    return [
      { id: currentProjectId, name: `Missing project (ID ${currentProjectId})` },
      ...options.map((project) => ({ id: project.id, name: project.name })),
    ];
  }

  return options.map((project) => ({ id: project.id, name: project.name }));
}

export function TaskDetailCard({
  detailPanelRef,
  form,
  selectedTask,
  activeTimerTaskId,
  isMutating,
  togglSettings,
  onDeleteTask,
  onSaveTask,
  onStartTimer,
  onStopTimer,
}: TaskDetailCardProps) {
  const projectOptions = getProjectOptions(togglSettings, selectedTask);

  return (
    <Card ref={detailPanelRef}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Focus</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Task detail</h2>
        </div>
        <Badge className={selectedTask ? getTaskPriorityBadgeClass(selectedTask.priority) : "normal-case tracking-[0.08em]"}>
          {selectedTask ? formatTaskPriority(selectedTask.priority) : "None"}
        </Badge>
      </div>
      {selectedTask ? (
        <form className="space-y-4" onSubmit={form.handleSubmit(onSaveTask)}>
          <Input aria-label="Detail title" {...form.register("title")} />
          <Textarea aria-label="Detail notes" {...form.register("notes")} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              aria-label="Detail estimated minutes"
              type="number"
              min={5}
              step={5}
              {...form.register("estimatedMinutes", { valueAsNumber: true })}
            />
            <select
              aria-label="Detail priority"
              className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)]"
              {...form.register("priority")}
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {formatTaskPriority(priority)}
                </option>
              ))}
            </select>
          </div>
          <select
            aria-label="Detail lifecycle"
            className="h-11 w-full rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)]"
            {...form.register("lifecycle")}
          >
            {TASK_LIFECYCLE_OPTIONS.map((value) => (
              <option key={value} value={value}>
              {formatTaskLifecycle(value)}
            </option>
          ))}
          </select>
          <div className="space-y-2">
            <select
              aria-label="Detail Toggl project"
              className="h-11 w-full rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!togglSettings.connected}
              {...form.register("togglProjectId")}
            >
              <option value="">
                {togglSettings.defaultProjectName
                  ? `Use workspace default (${togglSettings.defaultProjectName})`
                  : togglSettings.connected
                    ? "No project override"
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
                : selectedTask?.togglProjectId && projectOptions[0]?.id === selectedTask.togglProjectId && projectOptions[0]?.name.startsWith("Missing project")
                  ? "This task still references a Toggl project that is no longer in the current workspace catalog."
                  : `This task will start timers in ${togglSettings.workspaceName ?? "your saved Toggl workspace"}.`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="submit" disabled={isMutating}>
              Save
            </Button>
            {activeTimerTaskId === selectedTask.id ? (
              <Button type="button" variant="secondary" onClick={onStopTimer} disabled={isMutating}>
                <Square className="h-4 w-4" />
                Stop timer
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onStartTimer(selectedTask.id)}
                disabled={isMutating}
              >
                <Play className="h-4 w-4" />
                Start timer
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full border-[rgba(255,111,59,0.28)] text-[var(--accent)] hover:bg-[rgba(255,111,59,0.12)]"
            onClick={onDeleteTask}
            disabled={isMutating}
          >
            <Trash2 className="h-4 w-4" />
            Delete task
          </Button>
        </form>
      ) : (
        <p className="text-sm text-[var(--muted)]">Select a task to refine notes, priority, lifecycle, and timers.</p>
      )}
    </Card>
  );
}
