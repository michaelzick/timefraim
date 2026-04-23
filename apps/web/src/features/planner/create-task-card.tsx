import type { TogglIntegrationSettings } from "@timefraim/shared";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DurationInput } from "@/components/duration-input";
import { DurationPresets } from "@/components/duration-presets";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_OPTIONS, formatTaskPriority } from "@/features/planner/task-presentation";
import type { CreateTaskValues } from "@/features/planner/types";

type CreateTaskCardProps = {
  form: UseFormReturn<CreateTaskValues>;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  onSubmit: (values: CreateTaskValues) => Promise<unknown>;
};

function getDefaultProjectLabel(togglSettings: TogglIntegrationSettings) {
  if (!togglSettings.connected) {
    return "Connect Toggl in Settings to assign a project";
  }

  if (togglSettings.defaultProjectName) {
    return `Use workspace default (${togglSettings.defaultProjectName})`;
  }

  return "Without project";
}

export function CreateTaskCard({
  form,
  isMutating,
  togglSettings,
  onSubmit,
}: CreateTaskCardProps) {
  const {
    formState: { isValid },
  } = form;
  const isSubmitDisabled = isMutating || !isValid;

  return (
    <Card className="overflow-hidden">
      <div className="mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--heading)]">Task inbox</h2>
        </div>
      </div>
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input
          aria-label="Task title"
          placeholder="Add a task"
          {...form.register("title", {
            validate: (value) => value.trim().length > 0 || "Task title is required",
          })}
        />
        <Textarea
          aria-label="Task notes"
          placeholder="Why this matters"
          className="min-h-24"
          {...form.register("notes")}
        />
        <Controller
          control={form.control}
          name="estimatedMinutes"
          render={({ field }) => (
            <div className="space-y-3">
              <DurationPresets
                valueMinutes={field.value}
                onSelect={field.onChange}
                ariaLabelPrefix="Task"
              />
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                <DurationInput
                  valueMinutes={field.value}
                  onChange={field.onChange}
                  ariaLabelPrefix="Task"
                />
                <select
                  aria-label="Task priority"
                  className="h-11 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  {...form.register("priority")}
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority} className="bg-[var(--panel)]">
                      {formatTaskPriority(priority)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        />
        <div className="space-y-2">
          <select
            aria-label="Task Toggl project"
            className="h-11 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
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
          <p className="text-xs text-[var(--muted)]">
            {togglSettings.connected
              ? `Timers for this task will run in ${togglSettings.workspaceName ?? "your saved Toggl workspace"}.`
              : "Connect Toggl from Settings to choose a project per task."}
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
          {isMutating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Add task
        </Button>
      </form>
    </Card>
  );
}
