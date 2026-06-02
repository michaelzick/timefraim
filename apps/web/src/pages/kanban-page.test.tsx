import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { KanbanPage } from "@/pages/kanban-page";
import { buildDayPlan } from "@/test/fixtures";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const noopAsync = () => Promise.resolve(undefined);

function renderKanbanPage(overrides: Partial<ComponentProps<typeof KanbanPage>> = {}) {
  return render(
    <MemoryRouter>
      <KanbanPage
        date="2026-04-06"
        dayPlan={buildDayPlan()}
        isMutating={false}
        onCreateScheduleBlock={noopAsync}
        onDeleteScheduleBlock={noopAsync}
        onDeleteTask={noopAsync}
        onStartTimer={noopAsync}
        onStopTimer={noopAsync}
        onUpdateTask={noopAsync}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe("KanbanPage", () => {
  it("renders board columns and planner links for each card", () => {
    const dayPlan = buildDayPlan();

    renderKanbanPage({ dayPlan });

    expect(screen.getByRole("heading", { name: "Board" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Planned" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Board date")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /planner/i })[0]).toHaveAttribute(
      "href",
      `/?date=2026-04-06&task=${dayPlan.tasks[0].id}`,
    );
  });

  it("plans an unscheduled card onto the selected day", async () => {
    const user = userEvent.setup();
    const onCreateScheduleBlock = vi.fn().mockResolvedValue(undefined);

    renderKanbanPage({ onCreateScheduleBlock });

    await user.click(screen.getAllByRole("button", { name: "Plan" })[0]);

    await waitFor(() => {
      expect(onCreateScheduleBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          plannerDate: "2026-04-06",
          source: "manual",
          taskId: buildDayPlan().tasks[0].id,
        }),
      );
    });
  });

  it("clears board search on Escape", async () => {
    const user = userEvent.setup();

    renderKanbanPage();

    const search = screen.getByRole("textbox", { name: "Search board tasks" });
    await user.type(search, "roadmap");
    expect(search).toHaveValue("roadmap");

    await user.keyboard("{Escape}");

    expect(search).toHaveValue("");
  });

  it("moves non-inbox cards back to Inbox without deleting them", async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);

    renderKanbanPage({ onUpdateTask });

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);

    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenCalledWith(
        buildDayPlan().tasks[0].id,
        expect.objectContaining({ completedOnDate: undefined, status: "inbox" }),
      );
    });
  });

  it("deletes cards only from Inbox", async () => {
    const user = userEvent.setup();
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const inboxTask = buildDayPlan().tasks[0];

    renderKanbanPage({
      dayPlan: buildDayPlan({ tasks: [{ ...inboxTask, status: "inbox" }] }),
      onDeleteTask,
    });

    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(onDeleteTask).toHaveBeenCalledWith(inboxTask.id);
    });
    confirmSpy.mockRestore();
  });

  it("cycles task priority from high to urgent", async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);
    const task = { ...buildDayPlan().tasks[0], priority: "high" as const };

    renderKanbanPage({ dayPlan: buildDayPlan({ tasks: [task] }), onUpdateTask });

    await user.click(screen.getByRole("button", { name: /change priority/i }));

    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenCalledWith(task.id, { priority: "urgent" });
    });
  });

  it("shows scheduled dates and running timer state on Kanban cards", () => {
    const task = {
      ...buildDayPlan().tasks[0],
      scheduledBlockId: "block-1f8f9660-0000-4000-8000-000000000001",
      scheduledStartAt: "2026-04-08T16:00:00.000Z",
      scheduledEndAt: "2026-04-08T16:45:00.000Z",
      status: "in_progress" as const,
    };

    renderKanbanPage({
      dayPlan: buildDayPlan({
        activeTimer: {
          id: "timer-1f8f9660-0000-4000-8000-000000000001",
          taskId: task.id,
          calendarEventId: null,
          togglEntryId: null,
          startedAt: new Date(Date.now() - 65_000).toISOString(),
          endedAt: null,
          durationSeconds: null,
          source: "manual",
        },
        tasks: [task],
      }),
    });

    expect(screen.getByText(/Apr 8,/)).toBeInTheDocument();
    expect(screen.getByText(/Running 01:0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });
});
