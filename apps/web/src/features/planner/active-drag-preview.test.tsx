import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActiveDragPreview } from "@/features/planner/active-drag-preview";
import { buildTask } from "@/test/fixtures";

describe("ActiveDragPreview", () => {
  it("keeps queue task previews solid", () => {
    const { container } = render(
      <ActiveDragPreview payload={{ dragType: "queue-task", task: buildTask() }} />,
    );

    expect(container.firstElementChild).not.toHaveClass("opacity-75");
  });

  it("makes scheduled task previews translucent while dragging", () => {
    const task = buildTask({ id: "task-1", scheduledBlockId: "block-1" });
    const { container } = render(
      <ActiveDragPreview
        payload={{
          dragType: "schedule-block",
          scheduleBlock: {
            id: "block-1",
            taskId: task.id,
            startAt: "2026-04-06T17:00:00.000Z",
            endAt: "2026-04-06T17:30:00.000Z",
            source: "manual",
            state: "confirmed",
            googleEventId: null,
            createdAt: "2026-04-06T08:00:00.000Z",
            updatedAt: "2026-04-06T08:00:00.000Z",
          },
          task,
        }}
      />,
    );

    expect(container.firstElementChild).toHaveClass("opacity-75");
  });
});
