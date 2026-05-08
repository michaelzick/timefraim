import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskPill } from "@/components/task-pill";
import { buildTask } from "@/test/fixtures";

const draggableState = vi.hoisted(() => ({
  transform: null as { x: number; y: number; scaleX: number; scaleY: number } | null,
  isDragging: false,
}));

vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: draggableState.transform,
    isDragging: draggableState.isDragging,
  }),
}));

describe("TaskPill", () => {
  beforeEach(() => {
    draggableState.transform = null;
    draggableState.isDragging = false;
  });

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

  it("uses the shared planner surface foreground tokens for queue cards", () => {
    render(
      <TaskPill
        task={buildTask()}
        active={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /plan launch week/i })).toHaveClass("text-[var(--planner-surface-title)]");
    expect(screen.getByText(/45 min/i).parentElement).toHaveClass("text-[var(--planner-surface-meta)]");
  });

  it("uses the white selection border for the active task and exposes a white keyboard focus ring", () => {
    const { container } = render(
      <TaskPill
        task={buildTask()}
        active
        onSelect={vi.fn()}
      />,
    );

    const card = container.firstElementChild as HTMLElement;

    expect(card).toHaveClass("border-[var(--timeline-selection-ring)]");
    expect(card).toHaveClass("focus-visible:ring-[var(--timeline-selection-ring)]");
    expect(card).not.toHaveClass("hover:border-[var(--panel-border-strong)]");
    expect(card).not.toHaveClass("ring-[rgba(255,111,59,0.28)]");
  });

  it("keeps the source card anchored and opaque during copy drags", () => {
    draggableState.transform = { x: 24, y: 12, scaleX: 1, scaleY: 1 };
    draggableState.isDragging = true;

    const { container } = render(
      <TaskPill
        task={buildTask()}
        active={false}
        isCopyDragSource
        onSelect={vi.fn()}
      />,
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.style.transform).toBe("");
    expect(card).not.toHaveClass("opacity-65");
  });
});
