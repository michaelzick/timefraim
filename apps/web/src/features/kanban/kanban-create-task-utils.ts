import type { CreateTaskValues, PlannerTaskInput } from "@/features/planner/types";

export function buildKanbanCreateTaskInput(values: CreateTaskValues): PlannerTaskInput {
  return {
    title: values.title.trim(),
    notes: values.notes || undefined,
    estimatedMinutes: Number(values.estimatedMinutes),
    priority: values.priority,
    status: "inbox",
    togglProjectId: values.togglProjectId || null,
  };
}
