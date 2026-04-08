import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlannerPage } from "@/pages/planner-page";
import { buildDayPlan } from "@/test/fixtures";

vi.mock("@/components/timeline-board", () => ({
  TimelineBoard: () => <div>timeline board</div>,
}));

const noopAsync = () => Promise.resolve(undefined);

describe("PlannerPage", () => {
  it("creates tasks and resets the capture form", async () => {
    const user = userEvent.setup();
    const onCreateTask = vi.fn().mockResolvedValue(undefined);

    render(
      <PlannerPage
        date="2026-04-06"
        dayPlan={buildDayPlan()}
        isMutating={false}
        isSyncing={false}
        onDateChange={vi.fn()}
        onCreateTask={onCreateTask}
        onUpdateTask={noopAsync}
        onDeleteTask={noopAsync}
        onCreateScheduleBlock={noopAsync}
        onDeleteScheduleBlock={noopAsync}
        onDismissCalendarEvent={noopAsync}
        onConfirmDraft={noopAsync}
        onRejectDraft={noopAsync}
        onStartTimer={noopAsync}
        onStopTimer={noopAsync}
        onSyncCalendar={noopAsync}
      />,
    );

    await user.type(screen.getByLabelText("Task title"), "Deep work");
    await user.type(screen.getByLabelText("Task notes"), "Protect a quiet block.");
    await user.clear(screen.getByLabelText("Estimated minutes"));
    await user.type(screen.getByLabelText("Estimated minutes"), "60");
    await user.selectOptions(screen.getByLabelText("Task status"), "planned");
    await user.click(screen.getByRole("button", { name: /add task/i }));

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        title: "Deep work",
        notes: "Protect a quiet block.",
        estimatedMinutes: 60,
        status: "planned",
      });
    });
    expect(screen.getByLabelText("Task title")).toHaveValue("");
    expect(screen.getByLabelText("Task notes")).toHaveValue("");
  });

  it("saves task detail updates and starts the selected timer", async () => {
    const user = userEvent.setup();
    const dayPlan = buildDayPlan();
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);
    const onStartTimer = vi.fn().mockResolvedValue(undefined);

    render(
      <PlannerPage
        date="2026-04-06"
        dayPlan={dayPlan}
        isMutating={false}
        isSyncing={false}
        onDateChange={vi.fn()}
        onCreateTask={noopAsync}
        onUpdateTask={onUpdateTask}
        onDeleteTask={noopAsync}
        onCreateScheduleBlock={noopAsync}
        onDeleteScheduleBlock={noopAsync}
        onDismissCalendarEvent={noopAsync}
        onConfirmDraft={noopAsync}
        onRejectDraft={noopAsync}
        onStartTimer={onStartTimer}
        onStopTimer={noopAsync}
        onSyncCalendar={noopAsync}
      />,
    );

    await user.clear(screen.getByLabelText("Detail title"));
    await user.type(screen.getByLabelText("Detail title"), "Refined task");
    await user.click(screen.getByRole("button", { name: /save detail/i }));
    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenCalledWith(
        dayPlan.tasks[0].id,
        expect.objectContaining({ title: "Refined task" }),
      );
    });

    await user.click(screen.getByRole("button", { name: /start timer/i }));
    expect(onStartTimer).toHaveBeenCalledWith(dayPlan.tasks[0].id);
  });

  it("deletes the selected task after confirmation", async () => {
    const user = userEvent.setup();
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <PlannerPage
        date="2026-04-06"
        dayPlan={buildDayPlan()}
        isMutating={false}
        isSyncing={false}
        onDateChange={vi.fn()}
        onCreateTask={noopAsync}
        onUpdateTask={noopAsync}
        onDeleteTask={onDeleteTask}
        onCreateScheduleBlock={noopAsync}
        onDeleteScheduleBlock={noopAsync}
        onDismissCalendarEvent={noopAsync}
        onConfirmDraft={noopAsync}
        onRejectDraft={noopAsync}
        onStartTimer={noopAsync}
        onStopTimer={noopAsync}
        onSyncCalendar={noopAsync}
      />,
    );

    await user.click(screen.getByRole("button", { name: /delete task/i }));

    await waitFor(() => {
      expect(onDeleteTask).toHaveBeenCalledWith("task-1f8f9660-0000-4000-8000-000000000001");
    });
  });

  it("shows an error when saving task details fails", async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn().mockRejectedValue(new Error("Schedule conflict with Standup"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <PlannerPage
        date="2026-04-06"
        dayPlan={buildDayPlan()}
        isMutating={false}
        isSyncing={false}
        onDateChange={vi.fn()}
        onCreateTask={noopAsync}
        onUpdateTask={onUpdateTask}
        onDeleteTask={noopAsync}
        onCreateScheduleBlock={noopAsync}
        onDeleteScheduleBlock={noopAsync}
        onDismissCalendarEvent={noopAsync}
        onConfirmDraft={noopAsync}
        onRejectDraft={noopAsync}
        onStartTimer={noopAsync}
        onStopTimer={noopAsync}
        onSyncCalendar={noopAsync}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save detail/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to save the task. Please try again.");
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to save the task. Please try again.",
      expect.any(Error),
    );
  });
});
