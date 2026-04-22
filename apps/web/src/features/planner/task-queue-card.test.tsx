import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskQueueCard } from "@/features/planner/task-queue-card";
import { buildTask } from "@/test/fixtures";

vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
    isDragging: false,
  }),
}));

describe("TaskQueueCard kebab menu", () => {
  it("does not offer a Mark done action on queue tasks", async () => {
    const user = userEvent.setup();
    render(
      <TaskQueueCard
        selectedTaskId={null}
        activeTimerTaskId={null}
        tasks={[buildTask({ title: "Outline slides" })]}
        onSelectTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onDuplicateTask={vi.fn()}
        onStartTaskTimer={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /more actions for outline slides/i }));

    expect(screen.queryByRole("menuitem", { name: /mark done/i })).toBeNull();
    expect(screen.getByRole("menuitem", { name: /duplicate/i })).toBeInTheDocument();
  });
});
