import { fireEvent, render, screen } from "@testing-library/react";
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
        search=""
        tasks={[buildTask({ title: "Outline slides" })]}
        onSearchChange={vi.fn()}
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

  it("renders the task filter above queued tasks", () => {
    const onSearchChange = vi.fn();

    render(
      <TaskQueueCard
        selectedTaskId={null}
        activeTimerTaskId={null}
        search="slides"
        tasks={[buildTask({ title: "Outline slides" })]}
        onSearchChange={onSearchChange}
        onSelectTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onDuplicateTask={vi.fn()}
        onStartTaskTimer={vi.fn()}
      />,
    );

    const filter = screen.getByLabelText("Filter tasks");

    expect(filter).toHaveValue("slides");
    expect(filter).toHaveAttribute("placeholder", "Search queue");

    fireEvent.change(filter, { target: { value: "brief" } });

    expect(onSearchChange).toHaveBeenCalledWith("brief");
  });
});
