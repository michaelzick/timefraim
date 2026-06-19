import type { Task } from "@timefraim/shared";
import { toast } from "sonner";
import { showKanbanActionError } from "@/features/kanban/kanban-errors";
import { formatTaskCategory, formatTaskPriority } from "@/features/planner/task-presentation";

export function createPriorityChangeHandler(
  onUpdateTask: (taskId: string, values: { priority: Task["priority"] }) => Promise<unknown>,
) {
  return (task: Task, priority: Task["priority"]) => {
    if (task.priority === priority) {
      return;
    }

    void onUpdateTask(task.id, { priority })
      .then(() => toast.success(`Priority changed to ${formatTaskPriority(priority)}`, { duration: 3000 }))
      .catch((error) => showKanbanActionError("Failed to change priority. Please try again.", error));
  };
}

export function createCategoryChangeHandler(
  onUpdateTask: (taskId: string, values: { category: Task["category"] }) => Promise<unknown>,
) {
  return (task: Task, category: Task["category"]) => {
    if (task.category === category) {
      return;
    }

    void onUpdateTask(task.id, { category })
      .then(() => toast.success(`Category changed to ${formatTaskCategory(category)}`, { duration: 3000 }))
      .catch((error) => showKanbanActionError("Failed to change category. Please try again.", error));
  };
}
