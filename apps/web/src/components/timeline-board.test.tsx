import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimelineBoard } from "@/components/timeline-board";
import { buildTask } from "@/test/fixtures";

vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: () => undefined,
    isOver: false,
  }),
}));

function getTimelineItem(title: string) {
  const item = screen.getByText(title).parentElement?.parentElement?.parentElement;
  expect(item).not.toBeNull();
  return item;
}

describe("TimelineBoard", () => {
  it("shows Google Calendar blockers and priority labels on scheduled tasks", () => {
    render(
      <TimelineBoard
        date="2026-04-06"
        tasks={[
          buildTask({
            id: "task-high",
            title: "Ship planner polish",
            priority: "high",
            status: "scheduled",
            scheduledBlockId: "block-high",
          }),
        ]}
        scheduleBlocks={[
          {
            id: "block-high",
            taskId: "task-high",
            startAt: "2026-04-06T17:00:00.000Z",
            endAt: "2026-04-06T17:45:00.000Z",
            source: "manual",
            state: "synced",
            googleEventId: "google-event-1",
            createdAt: "2026-04-06T08:00:00.000Z",
            updatedAt: "2026-04-06T08:00:00.000Z",
          },
        ]}
        calendarEvents={[
          {
            id: "calendar-1",
            externalEventId: "google-1",
            title: "Team sync",
            startAt: "2026-04-06T15:00:00.000Z",
            endAt: "2026-04-06T15:30:00.000Z",
            isAppManaged: false,
            backgroundColor: null,
            foregroundColor: null,
          },
        ]}
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Drop a task onto the timeline")).toBeInTheDocument();
    expect(screen.queryByText(/synced/i)).not.toBeInTheDocument();

    expect(getTimelineItem("Team sync")).toHaveStyle({
      backgroundColor: "rgba(55, 68, 109, 0.22)",
      color: "rgb(255, 255, 255)",
    });
    expect(getTimelineItem("Ship planner polish")).toHaveClass(
      "bg-[var(--priority-high-block)]",
      "shadow-[0_22px_54px_rgba(255,111,59,0.26)]",
    );
  });

  it("uses resolved Google colors when present", () => {
    render(
      <TimelineBoard
        date="2026-04-06"
        tasks={[]}
        scheduleBlocks={[]}
        calendarEvents={[
          {
            id: "calendar-1",
            externalEventId: "google-1",
            title: "Team sync",
            startAt: "2026-04-06T15:00:00.000Z",
            endAt: "2026-04-06T15:30:00.000Z",
            isAppManaged: false,
            backgroundColor: "#d50000",
            foregroundColor: "#ffffff",
          },
        ]}
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    expect(getTimelineItem("Team sync")).toHaveStyle({
      backgroundColor: "rgba(213, 0, 0, 0.22)",
      color: "rgb(255, 255, 255)",
    });
  });

  it("uses white text even when Google only provides a light background", () => {
    render(
      <TimelineBoard
        date="2026-04-06"
        tasks={[]}
        scheduleBlocks={[]}
        calendarEvents={[
          {
            id: "calendar-1",
            externalEventId: "google-1",
            title: "Team sync",
            startAt: "2026-04-06T15:00:00.000Z",
            endAt: "2026-04-06T15:30:00.000Z",
            isAppManaged: false,
            backgroundColor: "#f6c026",
            foregroundColor: null,
          },
        ]}
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    expect(getTimelineItem("Team sync")).toHaveStyle({
      backgroundColor: "rgba(246, 192, 38, 0.22)",
      color: "rgb(255, 255, 255)",
    });
  });
});
