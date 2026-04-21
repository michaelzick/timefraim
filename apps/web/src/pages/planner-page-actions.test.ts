import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { createPlannerMutationHandlers } from "@/pages/planner-page-actions";
import { buildTask } from "@/test/fixtures";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("createPlannerMutationHandlers", () => {
  it("marks a task done with the viewed date and clears that date on undo", async () => {
    const task = buildTask();
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);
    const handlers = createPlannerMutationHandlers({
      selectedTask: task,
      date: "2026-04-20",
      onDeleteTask: vi.fn(),
      onDeleteScheduleBlock: vi.fn(),
      onUpdateTask,
      onDuplicateTask: vi.fn(),
      onStartTimer: vi.fn(),
    });

    handlers.handleMarkTaskDone(task);

    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenCalledWith(
        task.id,
        expect.objectContaining({ status: "done", completedOnDate: "2026-04-20" }),
      );
    });

    const toastCall = vi.mocked(toast.success).mock.calls[0]?.[1] as
      | { action?: { onClick: () => void } }
      | undefined;
    const undoAction = toastCall?.action;
    expect(undoAction).toBeDefined();
    undoAction?.onClick();

    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenNthCalledWith(
        2,
        task.id,
        expect.objectContaining({ status: "planned", completedOnDate: null }),
      );
    });
  });

  it("reactivates a done task by clearing its completedOnDate", async () => {
    const task = buildTask({ status: "done", completedOnDate: "2026-04-19" });
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);
    const handlers = createPlannerMutationHandlers({
      selectedTask: task,
      date: "2026-04-20",
      onDeleteTask: vi.fn(),
      onDeleteScheduleBlock: vi.fn(),
      onUpdateTask,
      onDuplicateTask: vi.fn(),
      onStartTimer: vi.fn(),
    });

    handlers.handleReactivateDoneTask(task);

    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenCalledWith(
        task.id,
        expect.objectContaining({ status: "planned", completedOnDate: null }),
      );
    });
  });
});
