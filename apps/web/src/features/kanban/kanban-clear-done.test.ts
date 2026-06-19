import { describe, expect, it, vi } from "vitest";
import { buildTask } from "@/test/fixtures";
import { clearDoneTasks } from "@/features/kanban/kanban-clear-done";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("clearDoneTasks", () => {
  it("does nothing when there are no done tasks", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);

    await clearDoneTasks([], onDeleteTask);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onDeleteTask).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("does not delete anything when the confirmation is dismissed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);

    await clearDoneTasks([buildTask({ status: "done" })], onDeleteTask);

    expect(onDeleteTask).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("deletes every done task once confirmed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    const tasks = [
      buildTask({ id: "task-done-1", status: "done" }),
      buildTask({ id: "task-done-2", status: "done" }),
    ];

    await clearDoneTasks(tasks, onDeleteTask);

    expect(onDeleteTask).toHaveBeenCalledTimes(2);
    expect(onDeleteTask).toHaveBeenCalledWith("task-done-1");
    expect(onDeleteTask).toHaveBeenCalledWith("task-done-2");
    confirmSpy.mockRestore();
  });
});
