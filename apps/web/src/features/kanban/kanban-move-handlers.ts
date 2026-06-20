import { toast } from "sonner";
import type { Task } from "@timefraim/shared";
import { getKanbanMoveToast } from "@/features/kanban/kanban-dnd";
import { showKanbanActionError } from "@/features/kanban/kanban-errors";
import type { KanbanMoveInput, KanbanStatus } from "@/features/kanban/kanban-types";
import { moveTaskOnKanban } from "@/features/kanban/kanban-utils";

type KanbanMoveContext = Omit<KanbanMoveInput, "targetStatus" | "task">;

export function createKanbanMoveRunner(context: KanbanMoveContext) {
  return (task: Task, targetStatus: KanbanStatus) =>
    moveTaskOnKanban({ ...context, targetStatus, task })
      .then(() => toast.success(getKanbanMoveToast(targetStatus), { duration: 3000 }))
      .catch((error) =>
        showKanbanActionError("Failed to move the task. Please try again.", error),
      );
}
