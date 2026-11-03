import type { Task } from "@timefraim/shared";
import type { ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CALENDAR_DRAG_TYPE } from "@/features/calendar/calendar-dnd";
import { getCalendarEntry } from "@/features/calendar/calendar-entries";
import { getTimezoneOffsetForDate } from "@/lib/utils";
import { CalendarPage } from "@/pages/calendar-page";
import { buildTask } from "@/test/fixtures";

const drop = vi.hoisted(() => ({ event: null as unknown }));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: { children: ReactNode; onDragEnd?: (event: unknown) => void }) => (
    <div>
      <button type="button" onClick={() => onDragEnd?.(drop.event)}>
        Simulate drop
      </button>
      {children}
    </div>
  ),
  DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PointerSensor: class {},
  pointerWithin: vi.fn(),
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => undefined, isDragging: false }),
  useDroppable: () => ({ setNodeRef: () => undefined, isOver: false }),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}));

function localIso(value: string) {
  return new Date(value).toISOString();
}

const task = buildTask({
  id: "a",
  title: "Plan launch week",
  status: "scheduled",
  scheduledBlockId: "block-a",
  scheduledStartAt: localIso("2026-11-05T09:00:00"),
  scheduledEndAt: localIso("2026-11-05T09:45:00"),
});

function dropOn(dragged: Task, targetDate: string | null) {
  drop.event = {
    active: { data: { current: { dragType: CALENDAR_DRAG_TYPE, entry: getCalendarEntry(dragged) } } },
    over: targetDate ? { data: { current: { calendarDate: targetDate } } } : null,
  };
}

function renderCalendar(tasks: Task[]) {
  const onUpdateScheduleBlock = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <CalendarPage date="2026-11-03" tasks={tasks} isMutating={false} onUpdateScheduleBlock={onUpdateScheduleBlock} />
    </MemoryRouter>,
  );
  return { onUpdateScheduleBlock };
}

describe("CalendarPage drag and drop", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("moves a task to the dropped day at the same time", async () => {
    const user = userEvent.setup();
    const { onUpdateScheduleBlock } = renderCalendar([task]);
    dropOn(task, "2026-11-10");

    await user.click(screen.getByRole("button", { name: "Simulate drop" }));

    await waitFor(() => {
      expect(onUpdateScheduleBlock).toHaveBeenCalledWith("block-a", {
        startAt: localIso("2026-11-10T09:00:00"),
        endAt: localIso("2026-11-10T09:45:00"),
        plannerDate: "2026-11-10",
        tzOffsetMinutes: getTimezoneOffsetForDate("2026-11-10"),
      });
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  });

  it("does nothing when dropped back on the same day", async () => {
    const user = userEvent.setup();
    const { onUpdateScheduleBlock } = renderCalendar([task]);
    dropOn(task, "2026-11-05");

    await user.click(screen.getByRole("button", { name: "Simulate drop" }));

    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("does nothing when dropped outside a day", async () => {
    const user = userEvent.setup();
    const { onUpdateScheduleBlock } = renderCalendar([task]);
    dropOn(task, null);

    await user.click(screen.getByRole("button", { name: "Simulate drop" }));

    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
  });

  it("does nothing for a task with no block", async () => {
    const user = userEvent.setup();
    const done = buildTask({ id: "done", status: "done", completedOnDate: "2026-11-05" });
    const { onUpdateScheduleBlock } = renderCalendar([done]);
    dropOn(done, "2026-11-10");

    await user.click(screen.getByRole("button", { name: "Simulate drop" }));

    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
  });

  it("explains a conflict with a toast and leaves the task where it was", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const occupied = buildTask({
      id: "b",
      title: "Review roadmap",
      status: "scheduled",
      scheduledBlockId: "block-b",
      scheduledStartAt: localIso("2026-11-10T09:30:00"),
      scheduledEndAt: localIso("2026-11-10T10:30:00"),
    });
    const { onUpdateScheduleBlock } = renderCalendar([task, occupied]);
    dropOn(task, "2026-11-10");

    await user.click(screen.getByRole("button", { name: "Simulate drop" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('would overlap with "Review roadmap"'),
        expect.anything(),
      );
    });
    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("still sees a conflict with a task hidden by the category filter", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const hidden = buildTask({
      id: "b",
      title: "Work review",
      category: "work",
      status: "scheduled",
      scheduledBlockId: "block-b",
      scheduledStartAt: localIso("2026-11-10T09:30:00"),
      scheduledEndAt: localIso("2026-11-10T10:30:00"),
    });
    const { onUpdateScheduleBlock } = renderCalendar([task, hidden]);
    await user.click(
      within(screen.getByRole("group", { name: "Filter calendar by category" })).getByRole("button", {
        name: /personal/i,
      }),
    );
    dropOn(task, "2026-11-10");

    await user.click(screen.getByRole("button", { name: "Simulate drop" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("reports a failed request", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { onUpdateScheduleBlock } = renderCalendar([task]);
    onUpdateScheduleBlock.mockRejectedValueOnce(new Error("Network down"));
    dropOn(task, "2026-11-10");

    await user.click(screen.getByRole("button", { name: "Simulate drop" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to move the task. Please try again.", expect.anything());
    });
    expect(toast.success).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
