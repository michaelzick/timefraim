import type { TogglIntegrationSettings } from "@timefraim/shared";
import { LoaderCircle, Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DurationInput } from "@/components/duration-input";
import { DurationPresets } from "@/components/duration-presets";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_CREATE_TASK_VALUES } from "@/features/planner/planner-page-utils";
import { PRIORITY_OPTIONS, formatTaskPriority } from "@/features/planner/task-presentation";
import type { CreateTaskValues } from "@/features/planner/types";

type KanbanCreateTaskPanelProps = {
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  onClose: () => void;
  onSubmit: (values: CreateTaskValues) => Promise<unknown>;
};

function getDefaultProjectLabel(togglSettings: TogglIntegrationSettings) {
  if (!togglSettings.connected) {
    return "Without project";
  }

  if (togglSettings.defaultProjectName) {
    return `Use workspace default (${togglSettings.defaultProjectName})`;
  }

  return "Without project";
}

export function KanbanCreateTaskPanel({
  isMutating,
  togglSettings,
  onClose,
  onSubmit,
}: KanbanCreateTaskPanelProps) {
  const form = useForm<CreateTaskValues>({
    defaultValues: EMPTY_CREATE_TASK_VALUES,
    mode: "onChange",
  });
  const {
    formState: { isValid, isSubmitting },
  } = form;
  const isSubmitDisabled = isMutating || isSubmitting || !isValid;

  const handleSubmit = async (values: CreateTaskValues) => {
    await onSubmit(values);
    form.reset(EMPTY_CREATE_TASK_VALUES);
    onClose();
  };

  return (
    <div id="kanban-create-task-panel" className="mt-5 border-t border-[var(--panel-border)] pt-5">
      <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-3">
          <Input
            aria-label="Board task title"
            placeholder="Add a task"
            {...form.register("title", {
              validate: (value) => value.trim().length > 0 || "Task title is required",
            })}
          />
          <Textarea
            aria-label="Board task notes"
            placeholder="Notes"
            className="min-h-24"
            {...form.register("notes")}
          />
        </div>
        <div className="space-y-3">
          <Controller
            control={form.control}
            name="estimatedMinutes"
            render={({ field }) => (
              <div className="space-y-3">
                <DurationPresets valueMinutes={field.value} onSelect={field.onChange} ariaLabelPrefix="Board task" />
                <DurationInput valueMinutes={field.value} onChange={field.onChange} ariaLabelPrefix="Board task" />
              </div>
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Board task priority"
              className="h-11 min-w-0 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              {...form.register("priority")}
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority} className="bg-[var(--panel)]">
                  {formatTaskPriority(priority)}
                </option>
              ))}
            </select>
            <select
              aria-label="Board task Toggl project"
              className="h-11 min-w-0 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              disabled={!togglSettings.connected}
              {...form.register("togglProjectId")}
            >
              <option value="" className="bg-[var(--panel)]">
                {getDefaultProjectLabel(togglSettings)}
              </option>
              {togglSettings.availableProjects.map((project) => (
                <option key={project.id} value={project.id} className="bg-[var(--panel)]">
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {isSubmitting || isMutating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add task
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
