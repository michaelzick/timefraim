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
        onDateChange={vi.fn()}
        onDeleteScheduleBlock={noopAsync}
        onStartTimer={noopAsync}
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
});
