import type { Task } from "@timefraim/shared";
import { toast } from "sonner";
import { showKanbanActionError } from "@/features/kanban/kanban-errors";

export async function clearDoneTasks(
  doneTasks: Task[],
  onDeleteTask: (taskId: string) => Promise<unknown>,
) {
  const count = doneTasks.length;
  if (count === 0) {
    return;
  }
  if (!window.confirm(`Delete all ${count} done task${count === 1 ? "" : "s"}? This can't be undone.`)) {
    return;
  }

  try {
    await Promise.all(doneTasks.map((task) => onDeleteTask(task.id)));
    toast.success(`Cleared ${count} done task${count === 1 ? "" : "s"}`, { duration: 3000 });
  } catch (error) {
    showKanbanActionError("Failed to clear done tasks. Please try again.", error);
  }
}
