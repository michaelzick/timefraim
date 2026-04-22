import type { Task, TogglIntegrationSettings } from "@timefraim/shared";
import { Play, Save, Square, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DurationInput } from "@/components/duration-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PRIORITY_OPTIONS,
  TASK_LIFECYCLE_OPTIONS,
  formatTaskLifecycle,
  formatTaskPriority,
  getTaskPriorityBadgeClass,
} from "@/features/planner/task-presentation";
import { getTogglProjectOptions } from "@/features/planner/toggl-project-options";
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
  const projectOptions = getTogglProjectOptions(togglSettings, selectedTask?.togglProjectId ?? null);

  return (
    <Card ref={detailPanelRef}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Focus</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--heading)]">Task detail</h2>
        </div>
        <Badge className={selectedTask ? getTaskPriorityBadgeClass(selectedTask.priority) : "normal-case tracking-[0.08em]"}>
          {selectedTask ? formatTaskPriority(selectedTask.priority) : "None"}
        </Badge>
      </div>
      {selectedTask ? (
        <form className="space-y-4" onSubmit={form.handleSubmit(onSaveTask)}>
          <Input aria-label="Detail title" {...form.register("title")} />
          <Textarea aria-label="Detail notes" {...form.register("notes")} />
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
            <Controller
              control={form.control}
              name="estimatedMinutes"
              render={({ field }) => (
                <DurationInput
                  valueMinutes={field.value}
                  onChange={field.onChange}
                  ariaLabelPrefix="Detail"
                />
              )}
            />
            <select
              aria-label="Detail priority"
              className="h-11 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
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
            className="h-11 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
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
                : selectedTask?.togglProjectId && projectOptions[0]?.id === selectedTask.togglProjectId && projectOptions[0]?.name.startsWith("Missing project")
                  ? "This task still references a Toggl project that is no longer in the current workspace catalog."
                  : `This task will start timers in ${togglSettings.workspaceName ?? "your saved Toggl workspace"}.`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="submit"
              disabled={isMutating}
              variant={form.formState.isDirty ? "default" : "ghost"}
              className={cn(
                !form.formState.isDirty &&
                  "border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft-strong)] hover:text-[var(--accent)]",
              )}
            >
              <Save className="h-4 w-4" />
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
            className="w-full border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
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
