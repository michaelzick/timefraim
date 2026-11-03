import type { Task } from "@timefraim/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CalendarPage } from "@/pages/calendar-page";
import { buildTask } from "@/test/fixtures";

function localIso(value: string) {
  return new Date(value).toISOString();
}

function scheduledTask(id: string, title: string, start: string, end: string, overrides: Partial<Task> = {}) {
  return buildTask({
    id,
    title,
    status: "scheduled",
    scheduledBlockId: `block-${id}`,
    scheduledStartAt: localIso(start),
    scheduledEndAt: localIso(end),
    ...overrides,
  });
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderCalendar(tasks: Task[], initialEntry = "/calendar") {
  const onUpdateScheduleBlock = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CalendarPage date="2026-11-03" tasks={tasks} isMutating={false} onUpdateScheduleBlock={onUpdateScheduleBlock} />
      <LocationProbe />
    </MemoryRouter>,
  );
  return { onUpdateScheduleBlock };
}

function day(name: string) {
  return within(screen.getByRole("group", { name }));
}

describe("CalendarPage month view", () => {
  it("opens on the planner's date and lays tasks out on their days", () => {
    renderCalendar([
      scheduledTask("a", "Plan launch week", "2026-11-05T09:00:00", "2026-11-05T10:00:00"),
      scheduledTask("b", "Review roadmap", "2026-11-12T14:00:00", "2026-11-12T15:00:00"),
    ]);

    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
    expect(day("Thursday, November 5, 2026").getByRole("button", { name: /plan launch week/i })).toBeInTheDocument();
    expect(day("Thursday, November 12, 2026").getByRole("button", { name: /review roadmap/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plan launch week/i })).toHaveTextContent("9:00 AM");
  });

  it("shows done tasks on their completion date and leaves out queue tasks", () => {
    renderCalendar([
      buildTask({ id: "done", title: "Shipped it", status: "done", completedOnDate: "2026-11-09" }),
      buildTask({ id: "queue", title: "Still in the queue" }),
    ]);

    expect(day("Monday, November 9, 2026").getByRole("button", { name: /shipped it/i })).toBeInTheDocument();
    expect(screen.queryByText("Still in the queue")).not.toBeInTheDocument();
  });

  it("collapses a busy day and opens that week from +N more", async () => {
    const user = userEvent.setup();
    renderCalendar(
      ["09", "10", "11", "12"].map((hour) =>
        scheduledTask(hour, `Task ${hour}`, `2026-11-05T${hour}:00:00`, `2026-11-05T${hour}:30:00`),
      ),
    );

    const busyDay = day("Thursday, November 5, 2026");
    expect(busyDay.getByRole("button", { name: /task 09/i })).toBeInTheDocument();
    expect(busyDay.queryByRole("button", { name: /task 12/i })).not.toBeInTheDocument();

    await user.click(busyDay.getByRole("button", { name: "+1 more" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/calendar?view=week&anchor=2026-11-05");
    expect(screen.getByRole("heading", { name: "Nov 1 – 7, 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /task 12/i })).toBeInTheDocument();
  });

  it("opens a task in the Planner when its chip is clicked", async () => {
    const user = userEvent.setup();
    renderCalendar([scheduledTask("a", "Plan launch week", "2026-11-05T09:00:00", "2026-11-05T10:00:00")]);

    await user.click(screen.getByRole("button", { name: /plan launch week/i }));

    expect(screen.getByTestId("location")).toHaveTextContent("/?date=2026-11-05&task=a");
  });

  it("links a day number to that day in the Planner", () => {
    renderCalendar([]);

    expect(screen.getByRole("link", { name: "Open Thursday, November 5, 2026 in the Planner" })).toHaveAttribute(
      "href",
      "/?date=2026-11-05",
    );
  });

  it("filters by category", async () => {
    const user = userEvent.setup();
    renderCalendar([
      scheduledTask("a", "Personal thing", "2026-11-05T09:00:00", "2026-11-05T10:00:00"),
      scheduledTask("b", "Work thing", "2026-11-05T11:00:00", "2026-11-05T12:00:00", { category: "work" }),
    ]);

    await user.click(
      within(screen.getByRole("group", { name: "Filter calendar by category" })).getByRole("button", { name: /work/i }),
    );

    expect(screen.queryByRole("button", { name: /personal thing/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /work thing/i })).toBeInTheDocument();
  });

  it("falls back to the planner's date for a bad anchor", () => {
    renderCalendar([], "/calendar?view=nope&anchor=2026-02-31");

    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
  });
});

describe("CalendarPage navigation", () => {
  it("steps by month and returns to today without ever setting ?date=", async () => {
    const user = userEvent.setup();
    renderCalendar([]);

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "December 2026" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/calendar?view=month&anchor=2026-12-03");

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();

    expect(screen.getByTestId("location").textContent).not.toMatch(/[?&]date=/);
  });

  it("switches views and steps by week", async () => {
    const user = userEvent.setup();
    renderCalendar([]);

    await user.click(within(screen.getByRole("group", { name: "Calendar view" })).getByRole("button", { name: "Week" }));
    expect(screen.getByRole("heading", { name: "Nov 1 – 7, 2026" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { name: "Nov 8 – 14, 2026" })).toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).not.toMatch(/[?&]date=/);
  });
});

describe("CalendarPage week view", () => {
  const weekUrl = "/calendar?view=week&anchor=2026-11-03";

  it("places a task by its time on the hour grid", () => {
    renderCalendar([scheduledTask("a", "Plan launch week", "2026-11-05T09:00:00", "2026-11-05T09:45:00")], weekUrl);

    const chip = day("Thursday, November 5, 2026 schedule").getByRole("button", { name: /plan launch week/i });

    // 5 hours below the 4 AM start at 56px an hour, and 45 minutes tall.
    expect(chip).toHaveStyle({ top: "280px", height: "42px" });
  });

  it("gives short tasks enough height to read", () => {
    renderCalendar([scheduledTask("a", "Quick call", "2026-11-05T09:00:00", "2026-11-05T09:15:00")], weekUrl);

    expect(screen.getByRole("button", { name: /quick call/i })).toHaveStyle({ height: "18px" });
  });

  it("keeps done tasks with no time and blocks outside the grid visible in the top row", () => {
    renderCalendar(
      [
        buildTask({ id: "done", title: "Shipped it", status: "done", completedOnDate: "2026-11-05" }),
        scheduledTask("early", "Very early", "2026-11-05T02:00:00", "2026-11-05T03:00:00"),
      ],
      weekUrl,
    );

    const topRow = day("Thursday, November 5, 2026 tasks without a slot");
    expect(topRow.getByRole("button", { name: /shipped it/i })).toBeInTheDocument();
    expect(topRow.getByRole("button", { name: /very early/i })).toBeInTheDocument();
  });

  it("opens a task in the Planner when its chip is clicked", async () => {
    const user = userEvent.setup();
    renderCalendar([scheduledTask("a", "Plan launch week", "2026-11-05T09:00:00", "2026-11-05T10:00:00")], weekUrl);

    await user.click(screen.getByRole("button", { name: /plan launch week/i }));

    expect(screen.getByTestId("location")).toHaveTextContent("/?date=2026-11-05&task=a");
  });
});
