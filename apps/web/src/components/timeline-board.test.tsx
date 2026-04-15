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

    const item = getTimelineItem("Team sync");
    expect(item.style.backgroundColor).toBe("transparent");
    expect(item.style.borderColor).toBe("rgb(99, 116, 173)");
    expect(item.style.borderWidth).toBe("3px");
    expect(item.style.color).toBe("rgb(255, 255, 255)");
    expect(getTimelineItem("Ship planner polish")).toHaveClass(
      "bg-[var(--priority-high-block)]",
      "shadow-[0_22px_54px_rgba(255,111,59,0.26)]",
    );
  });

  it("keeps resolved Google colors opaque while using white text", () => {
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
            backgroundColor: "#9fe1e7",
            foregroundColor: "#1d1d1d",
          },
        ]}
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    const item = getTimelineItem("Team sync");
    expect(item.style.backgroundColor).toBe("transparent");
    expect(item.style.borderColor).toBe("rgb(159, 225, 231)");
    expect(item.style.borderWidth).toBe("3px");
    expect(item.style.color).toBe("rgb(255, 255, 255)");
    expect(screen.getByText("Google Calendar")).toHaveStyle({ color: "rgb(255, 255, 255)" });
    expect(screen.getByRole("button", { name: /hide/i })).toHaveStyle({ color: "rgb(255, 255, 255)" });
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

    const item = getTimelineItem("Team sync");
    expect(item.style.backgroundColor).toBe("transparent");
    expect(item.style.borderColor).toBe("rgb(246, 192, 38)");
    expect(item.style.borderWidth).toBe("3px");
    expect(item.style.color).toBe("rgb(255, 255, 255)");
    expect(screen.getByText("Google Calendar")).toHaveStyle({ color: "rgb(255, 255, 255)" });
    expect(screen.getByRole("button", { name: /hide/i })).toHaveStyle({ color: "rgb(255, 255, 255)" });
  });
});
