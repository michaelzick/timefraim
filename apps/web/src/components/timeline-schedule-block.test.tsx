import type { ScheduleBlock, Task } from "@timefraim/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimelineScheduleBlock } from "@/components/timeline-schedule-block";
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

function renderBlock(args: {
  block: ScheduleBlock;
  runState: "idle" | "running" | "done";
  runningStartedAt: string | null;
  isSelected?: boolean;
  isCopyDragSource?: boolean;
  onResizeTaskDuration?: (task: Task, durationMinutes: number) => void;
  onSelectTask?: (taskId: string) => void;
}) {
  const task = buildTask({ id: args.block.taskId, title: "Focused work", estimatedMinutes: 30 });
  return render(
    <TimelineScheduleBlock
      block={args.block}
      date="2026-04-06"
      task={task}
      isSelected={args.isSelected ?? false}
      isCopyDragSource={args.isCopyDragSource}
      runState={args.runState}
      runningStartedAt={args.runningStartedAt}
      onDeleteScheduleBlock={vi.fn()}
      onDuplicateTask={vi.fn()}
      onStartTaskTimer={vi.fn()}
      onResizeTaskDuration={args.onResizeTaskDuration}
      onSelectTask={args.onSelectTask ?? vi.fn()}
    />,
  );
}

const baseBlock: ScheduleBlock = {
  id: "block-1",
  taskId: "task-1",
  startAt: "2026-04-06T17:00:00.000Z",
  endAt: "2026-04-06T17:30:00.000Z",
  source: "manual",
  state: "confirmed",
  googleEventId: null,
  createdAt: "2026-04-06T08:00:00.000Z",
  updatedAt: "2026-04-06T08:00:00.000Z",
};

describe("TimelineScheduleBlock", () => {
  beforeEach(() => {
    draggableState.transform = null;
    draggableState.isDragging = false;
  });

  it("renders the running timer inline for short blocks", () => {
    renderBlock({
      block: baseBlock,
      runState: "running",
      runningStartedAt: "2026-04-06T16:59:45.000Z",
    });

    expect(screen.getByTestId("inline-running-timer")).toBeInTheDocument();
    expect(screen.queryByText(/^Running /)).toBeNull();
  });

  it("keeps the badge layout for long blocks", () => {
    renderBlock({
      block: { ...baseBlock, endAt: "2026-04-06T19:00:00.000Z" },
      runState: "running",
      runningStartedAt: "2026-04-06T16:59:45.000Z",
    });

    expect(screen.queryByTestId("inline-running-timer")).toBeNull();
    expect(screen.getByText(/^Running /)).toBeInTheDocument();
  });

  it("surfaces failed Google sync state", () => {
    renderBlock({
      block: { ...baseBlock, state: "failed" },
      runState: "idle",
      runningStartedAt: null,
    });

    expect(screen.getByRole("status", { name: /google sync failed/i })).toHaveTextContent("Sync failed");
  });

  it.each(["light", "dark"] as const)("uses the white selected border and planner foregrounds in %s mode", (theme) => {
    document.documentElement.className = theme;

    const { container } = renderBlock({
      block: baseBlock,
      runState: "idle",
      runningStartedAt: null,
      isSelected: true,
    });

    expect(container.firstElementChild).toHaveClass("border-[var(--timeline-selection-ring)]");
    expect(screen.getByText("Focused work")).toHaveClass("text-[var(--planner-surface-title)]");
    expect(container.querySelector('[class*="text-[var(--planner-surface-meta)]"]')).not.toBeNull();
  });

  it("renders a bottom resize handle for scheduled tasks", () => {
    renderBlock({
      block: baseBlock,
      runState: "idle",
      runningStartedAt: null,
      onResizeTaskDuration: vi.fn(),
    });

    expect(screen.getByRole("button", { name: /resize scheduled task duration/i })).toBeInTheDocument();
  });

  it("previews and commits quarter-hour resize changes", () => {
    const onResizeTaskDuration = vi.fn();
    const { container } = renderBlock({
      block: baseBlock,
      runState: "idle",
      runningStartedAt: null,
      onResizeTaskDuration,
    });
    const blockElement = container.firstElementChild as HTMLElement;
    const handle = screen.getByTestId("timeline-resize-handle");

    fireEvent(handle, new MouseEvent("pointerdown", { bubbles: true, button: 0, clientY: 100 }));
    fireEvent(window, new MouseEvent("pointermove", { bubbles: true, clientY: 128 }));

    expect(blockElement.style.height).toBe("84px");
    expect(handle).toHaveAttribute("data-resizing", "true");
    expect(handle).toHaveAttribute("data-duration-minutes", "45");

    fireEvent(window, new MouseEvent("pointerup", { bubbles: true, clientY: 128 }));

    expect(onResizeTaskDuration).toHaveBeenCalledWith(
      expect.objectContaining({ id: baseBlock.taskId }),
      45,
    );
  });

  it("does not select the task when the resize handle is clicked", () => {
    const onSelectTask = vi.fn();
    renderBlock({
      block: baseBlock,
      runState: "idle",
      runningStartedAt: null,
      onResizeTaskDuration: vi.fn(),
      onSelectTask,
    });

    fireEvent.click(screen.getByTestId("timeline-resize-handle"));

    expect(onSelectTask).not.toHaveBeenCalled();
  });

  it("keeps the scheduled source block anchored and opaque during copy drags", () => {
    draggableState.transform = { x: 30, y: 60, scaleX: 1, scaleY: 1 };
    draggableState.isDragging = true;

    const { container } = renderBlock({
      block: baseBlock,
      runState: "idle",
      runningStartedAt: null,
      isCopyDragSource: true,
    });

    const blockElement = container.firstElementChild as HTMLElement;
    expect(blockElement.style.transform).toBe("");
    expect(blockElement).not.toHaveClass("opacity-75");
  });
});
