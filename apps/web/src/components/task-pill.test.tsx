import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskPill } from "@/components/task-pill";
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

describe("TaskPill", () => {
  it("keeps custom task controls visibly clickable", () => {
    const { container } = render(
      <TaskPill
        task={buildTask()}
        active={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
      />,
    );

    expect(container.firstElementChild).toHaveClass("cursor-pointer");
    expect(screen.getByRole("button", { name: /more actions for plan launch week/i })).toHaveClass("cursor-pointer");
  });
});
