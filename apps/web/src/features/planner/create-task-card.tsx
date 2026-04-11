import { LoaderCircle, Sparkles } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_OPTIONS, formatTaskPriority } from "@/features/planner/task-presentation";
import type { CreateTaskValues } from "@/features/planner/types";

type CreateTaskCardProps = {
  form: UseFormReturn<CreateTaskValues>;
  totalTasks: number;
  isMutating: boolean;
  onSubmit: (values: CreateTaskValues) => Promise<unknown>;
};

export function CreateTaskCard({ form, totalTasks, isMutating, onSubmit }: CreateTaskCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Capture</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Task inbox</h2>
        </div>
        <Badge>{totalTasks} total</Badge>
      </div>
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input aria-label="Task title" placeholder="Next commitment" {...form.register("title")} />
        <Textarea
          aria-label="Task notes"
          placeholder="Why this matters right now"
          className="min-h-24"
          {...form.register("notes")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            aria-label="Estimated minutes"
            type="number"
            min={5}
            step={5}
            {...form.register("estimatedMinutes", { valueAsNumber: true })}
          />
          <select
            aria-label="Task priority"
            className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)]"
            {...form.register("priority")}
          >
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority} className="bg-[var(--panel)]">
                {formatTaskPriority(priority)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="w-full" disabled={isMutating}>
          {isMutating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Add task
        </Button>
      </form>
    </Card>
  );
}
