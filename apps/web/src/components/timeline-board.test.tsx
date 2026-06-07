import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CalendarEventView } from "@timefraim/shared";
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
  return item as HTMLElement;
}

function buildCalendarEvent(overrides: Partial<CalendarEventView> = {}): CalendarEventView {
  return {
    id: "calendar-1",
    externalEventId: "google-1",
    title: "Team sync",
    startAt: "2026-04-06T15:00:00.000Z",
    endAt: "2026-04-06T15:30:00.000Z",
    isAppManaged: false,
    backgroundColor: null,
    foregroundColor: null,
    sourceCalendarId: null,
    sourceCalendarName: null,
    togglProjectId: null,
    ...overrides,
  };
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
            sourceCalendarId: null,
            sourceCalendarName: null,
            togglProjectId: null,
          },
        ]}
        activeTimer={null}
        selectedTaskId={null}
        selectedCalendarEventId={null}
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onSelectCalendarEvent={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.queryByText(/synced/i)).not.toBeInTheDocument();

    const item = getTimelineItem("Team sync");
    expect(item.style.backgroundColor).toBe("transparent");
    expect(item.style.borderColor).toBe("rgb(99, 116, 173)");
    expect(item.style.borderWidth).toBe("3px");
    expect(item.style.color).toBe("var(--calendar-event-title)");
    const scheduledItem = getTimelineItem("Ship planner polish");
    expect(scheduledItem).toHaveClass("bg-[var(--priority-high-block)]");
    expect(scheduledItem.className).not.toContain("shadow-[");
  });

  it("keeps resolved Google colors opaque while using theme-aware text", () => {
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
            sourceCalendarId: null,
            sourceCalendarName: null,
            togglProjectId: null,
          },
        ]}
        activeTimer={null}
        selectedTaskId={null}
        selectedCalendarEventId={null}
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onSelectCalendarEvent={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    const item = getTimelineItem("Team sync");
    expect(item.style.backgroundColor).toBe("transparent");
    expect(item.style.borderColor).toBe("rgb(159, 225, 231)");
    expect(item.style.borderWidth).toBe("3px");
    expect(item.style.color).toBe("var(--calendar-event-title)");
    expect(screen.getByText("Google Calendar")).toHaveStyle({ color: "var(--calendar-event-title)" });
    expect(screen.getByRole("button", { name: /hide/i })).toHaveStyle({ color: "var(--calendar-event-title)" });
  });

  it("uses theme-aware text even when Google only provides a light background", () => {
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
            sourceCalendarId: null,
            sourceCalendarName: null,
            togglProjectId: null,
          },
        ]}
        activeTimer={null}
        selectedTaskId={null}
        selectedCalendarEventId={null}
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onSelectCalendarEvent={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    const item = getTimelineItem("Team sync");
    expect(item.style.backgroundColor).toBe("transparent");
    expect(item.style.borderColor).toBe("rgb(246, 192, 38)");
    expect(item.style.borderWidth).toBe("3px");
    expect(item.style.color).toBe("var(--calendar-event-title)");
    expect(screen.getByText("Google Calendar")).toHaveStyle({ color: "var(--calendar-event-title)" });
    expect(screen.getByRole("button", { name: /hide/i })).toHaveStyle({ color: "var(--calendar-event-title)" });
  });

  it("dismisses a calendar event without selecting it first", async () => {
    const user = userEvent.setup();
    const onDismissCalendarEvent = vi.fn();
    const onSelectCalendarEvent = vi.fn();

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
            backgroundColor: null,
            foregroundColor: null,
            sourceCalendarId: null,
            sourceCalendarName: null,
            togglProjectId: null,
          },
        ]}
        selectedTaskId={null}
        selectedCalendarEventId={null}
        activeTimer={null}
        onDismissCalendarEvent={onDismissCalendarEvent}
        onSelectTask={vi.fn()}
        onSelectCalendarEvent={onSelectCalendarEvent}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /hide/i }));

    expect(onDismissCalendarEvent).toHaveBeenCalledWith("calendar-1", "Team sync");
    expect(onSelectCalendarEvent).not.toHaveBeenCalled();
  });

  it("splits simultaneous Google Calendar blockers into equal horizontal lanes", () => {
    render(
      <TimelineBoard
        date="2026-04-06"
        tasks={[]}
        scheduleBlocks={[]}
        calendarEvents={[
          buildCalendarEvent({
            id: "calendar-1",
            externalEventId: "google-1",
            title: "Clean",
            startAt: "2026-04-06T20:00:00.000Z",
            endAt: "2026-04-06T21:00:00.000Z",
          }),
          buildCalendarEvent({
            id: "calendar-2",
            externalEventId: "google-2",
            title: "Laundry",
            startAt: "2026-04-06T20:00:00.000Z",
            endAt: "2026-04-06T21:00:00.000Z",
          }),
          buildCalendarEvent({
            id: "calendar-3",
            externalEventId: "google-3",
            title: "Bird Stuff",
            startAt: "2026-04-06T20:00:00.000Z",
            endAt: "2026-04-06T21:00:00.000Z",
          }),
        ]}
        selectedTaskId={null}
        selectedCalendarEventId={null}
        activeTimer={null}
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onSelectCalendarEvent={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    const firstEvent = getTimelineItem("Clean");
    const secondEvent = getTimelineItem("Laundry");
    const thirdEvent = getTimelineItem("Bird Stuff");

    expect(firstEvent.style.top).toBe(secondEvent.style.top);
    expect(secondEvent.style.top).toBe(thirdEvent.style.top);
    expect(firstEvent.style.getPropertyValue("--timeline-event-width")).toBe("calc((100% - 16px) / 3)");
    expect(secondEvent.style.getPropertyValue("--timeline-event-width")).toBe("calc((100% - 16px) / 3)");
    expect(thirdEvent.style.getPropertyValue("--timeline-event-width")).toBe("calc((100% - 16px) / 3)");
    expect(firstEvent.style.getPropertyValue("--timeline-event-left")).toBe("calc(8px + ((100% - 16px) / 3) * 0)");
    expect(secondEvent.style.getPropertyValue("--timeline-event-left")).toBe("calc(8px + ((100% - 16px) / 3) * 1)");
    expect(thirdEvent.style.getPropertyValue("--timeline-event-left")).toBe("calc(8px + ((100% - 16px) / 3) * 2)");
    expect(screen.getAllByRole("button", { name: /hide/i })).toHaveLength(3);
  });

  it.each(["light", "dark"] as const)("uses the white selected border for calendar events in %s mode", (theme) => {
    document.documentElement.className = theme;

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
            foregroundColor: null,
            sourceCalendarId: null,
            sourceCalendarName: null,
            togglProjectId: null,
          },
        ]}
        activeTimer={null}
        selectedTaskId={null}
        selectedCalendarEventId="calendar-1"
        onDismissCalendarEvent={vi.fn()}
        onSelectTask={vi.fn()}
        onSelectCalendarEvent={vi.fn()}
        onDeleteScheduleBlock={vi.fn()}
      />,
    );

    expect(getTimelineItem("Team sync").style.borderColor).toBe("var(--timeline-selection-ring)");
  });
});
