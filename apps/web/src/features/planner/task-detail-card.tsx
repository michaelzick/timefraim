import type { Task } from "@timefraim/shared";
import { Play, Square, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_OPTIONS, type TaskFormValues } from "@/features/planner/types";

type TaskDetailCardProps = {
  detailPanelRef: RefObject<HTMLDivElement | null>;
  form: UseFormReturn<TaskFormValues>;
  selectedTask: Task | null;
  activeTimerTaskId: string | null;
  isMutating: boolean;
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
  onDeleteTask,
  onSaveTask,
  onStartTimer,
  onStopTimer,
}: TaskDetailCardProps) {
  return (
    <Card ref={detailPanelRef}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Focus</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Task detail</h2>
        </div>
        <Badge>{selectedTask?.status.replace("_", " ") ?? "none"}</Badge>
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
              aria-label="Detail status"
              className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)]"
              {...form.register("status")}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} className="bg-[var(--panel)]">
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="submit" variant="secondary" disabled={isMutating}>
              Save detail
            </Button>
            {activeTimerTaskId === selectedTask.id ? (
              <Button type="button" onClick={onStopTimer} disabled={isMutating}>
                <Square className="h-4 w-4" />
                Stop timer
              </Button>
            ) : (
              <Button type="button" onClick={() => onStartTimer(selectedTask.id)} disabled={isMutating}>
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
        <p className="text-sm text-[var(--muted)]">Select a task to refine notes, status, and timers.</p>
      )}
    </Card>
  );
}
