import type { TogglIntegrationSettings } from "@timefraim/shared";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DurationInput } from "@/components/duration-input";
import { DurationPresets } from "@/components/duration-presets";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_CREATE_TASK_VALUES } from "@/features/planner/planner-page-utils";
import { PRIORITY_OPTIONS, formatTaskPriority } from "@/features/planner/task-presentation";
import {
  getDefaultTogglProjectLabel,
  getTogglProjectHelperText,
} from "@/features/planner/toggl-project-options";
import type { CreateTaskValues } from "@/features/planner/types";

type KanbanCreateTaskPanelProps = {
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  onClose: () => void;
  onSubmit: (values: CreateTaskValues) => Promise<unknown>;
};

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
    formState: { isValid, isSubmitting, errors },
  } = form;
  const isSubmitDisabled = isMutating || isSubmitting || !isValid;

  const handleSubmit = async (values: CreateTaskValues) => {
    await onSubmit(values);
    form.reset(EMPTY_CREATE_TASK_VALUES);
    onClose();
  };

  return (
    <Card id="kanban-create-task-panel">
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <Input
                aria-label="Board task title"
                placeholder="Add a task"
                aria-invalid={errors.title ? "true" : undefined}
                {...form.register("title", {
                  validate: (value) => value.trim().length > 0 || "Task title is required",
                })}
              />
              {errors.title ? (
                <p className="text-xs text-[var(--danger)]">{errors.title.message}</p>
              ) : null}
            </div>
            <Textarea
              aria-label="Board task notes"
              placeholder="Why this matters"
              className="min-h-28 flex-1"
              {...form.register("notes")}
            />
          </div>
          <div className="flex flex-col gap-3">
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
              <Select aria-label="Board task priority" {...form.register("priority")}>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority} className="bg-[var(--panel)]">
                    {formatTaskPriority(priority)}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Board task Toggl project"
                disabled={!togglSettings.connected}
                {...form.register("togglProjectId")}
              >
                <option value="" className="bg-[var(--panel)]">
                  {getDefaultTogglProjectLabel(togglSettings)}
                </option>
                {togglSettings.availableProjects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-[var(--panel)]">
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-xs text-[var(--muted)]">{getTogglProjectHelperText(togglSettings)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--panel-border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {isSubmitting || isMutating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Add task
          </Button>
        </div>
      </form>
    </Card>
  );
}
