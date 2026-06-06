import type { TogglIntegrationSettings } from "@timefraim/shared";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DurationInput } from "@/components/duration-input";
import { DurationPresets } from "@/components/duration-presets";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlannerSectionHeader } from "@/features/planner/planner-section-header";
import { PRIORITY_OPTIONS, formatTaskPriority } from "@/features/planner/task-presentation";
import {
  getDefaultTogglProjectLabel,
  getTogglProjectHelperText,
} from "@/features/planner/toggl-project-options";
import type { CreateTaskValues } from "@/features/planner/types";

type CreateTaskCardProps = {
  form: UseFormReturn<CreateTaskValues>;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  onSubmit: (values: CreateTaskValues) => Promise<unknown>;
};

export function CreateTaskCard({
  form,
  isMutating,
  togglSettings,
  onSubmit,
}: CreateTaskCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const {
    formState: { isValid, errors },
  } = form;
  const isSubmitDisabled = isMutating || !isValid;

  return (
    <Card className="overflow-hidden">
      <PlannerSectionHeader
        title="Task inbox"
        isOpen={isOpen}
        controlsId="task-inbox-panel"
        onToggle={() => setIsOpen((prev) => !prev)}
      />
      {isOpen ? (
        <div id="task-inbox-panel">
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <Input
              aria-label="Task title"
              placeholder="Add a task"
              aria-invalid={errors.title ? "true" : undefined}
              {...form.register("title", {
                validate: (value) => value.trim().length > 0 || "Task title is required",
              })}
            />
            {errors.title ? (
              <p className="text-xs text-[var(--danger)]">{errors.title.message}</p>
            ) : null}
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
                    <Select aria-label="Task priority" {...form.register("priority")}>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority} className="bg-[var(--panel)]">
                          {formatTaskPriority(priority)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
            />
            <div className="space-y-2">
              <Select
                aria-label="Task Toggl project"
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
              <p className="text-xs text-[var(--muted)]">{getTogglProjectHelperText(togglSettings)}</p>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
              {isMutating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Add task
            </Button>
          </form>
        </div>
      ) : null}
    </Card>
  );
}
