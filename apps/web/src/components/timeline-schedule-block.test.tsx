import type { ScheduleBlock } from "@timefraim/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimelineScheduleBlock } from "@/components/timeline-schedule-block";
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

function renderBlock(args: {
  block: ScheduleBlock;
  runState: "idle" | "running" | "done";
  runningStartedAt: string | null;
}) {
  const task = buildTask({ id: args.block.taskId, title: "Focused work" });
  return render(
    <TimelineScheduleBlock
      block={args.block}
      date="2026-04-06"
      task={task}
      isSelected={false}
      runState={args.runState}
      runningStartedAt={args.runningStartedAt}
      onDeleteScheduleBlock={vi.fn()}
      onDuplicateTask={vi.fn()}
      onStartTaskTimer={vi.fn()}
      onSelectTask={vi.fn()}
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
});
