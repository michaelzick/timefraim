import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PlannerPage } from "@/pages/planner-page";
import { buildDayPlan, buildTask, buildTogglSettings } from "@/test/fixtures";

vi.mock("@/components/timeline-board", () => ({
  TimelineBoard: () => <div>timeline board</div>,
}));

const noopAsync = () => Promise.resolve(undefined);
const resizeObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", resizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function buildPlannerPageProps(overrides: Partial<ComponentProps<typeof PlannerPage>> = {}) {
  return {
    date: "2026-04-06",
    dayPlan: buildDayPlan(),
    isMutating: false,
    isSyncing: false,
    onDateChange: vi.fn(),
    onCreateTask: noopAsync,
    onUpdateTask: noopAsync,
    onDeleteTask: noopAsync,
    onCreateScheduleBlock: noopAsync,
    onUpdateScheduleBlock: noopAsync,
    onDeleteScheduleBlock: noopAsync,
    onDismissCalendarEvent: noopAsync,
    onConfirmDraft: noopAsync,
    onRejectDraft: noopAsync,
    onStartTimer: noopAsync,
    onStartEventTimer: noopAsync,
    onStopTimer: noopAsync,
    onSyncCalendar: noopAsync,
    togglSettings: buildTogglSettings(),
    ...overrides,
  };
}

describe("PlannerPage", () => {
  it("creates tasks and resets the capture form", async () => {
    const user = userEvent.setup();
    const onCreateTask = vi.fn().mockResolvedValue(undefined);

    render(<PlannerPage {...buildPlannerPageProps({ onCreateTask })} />);

    await user.type(screen.getByLabelText("Task title"), "Deep work");
    await user.type(screen.getByLabelText("Task notes"), "Protect a quiet block.");
    await user.clear(screen.getByLabelText("Estimated minutes"));
    await user.type(screen.getByLabelText("Estimated minutes"), "60");
    await user.selectOptions(screen.getByLabelText("Task priority"), "high");
    await user.click(screen.getByRole("button", { name: /add task/i }));

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        title: "Deep work",
        notes: "Protect a quiet block.",
        estimatedMinutes: 60,
        priority: "high",
        status: "planned",
        togglProjectId: null,
        plannerDate: "2026-04-06",
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

    render(<PlannerPage {...buildPlannerPageProps({ dayPlan, onUpdateTask, onStartTimer })} />);

    await user.clear(screen.getByLabelText("Detail title"));
    await user.type(screen.getByLabelText("Detail title"), "Refined task");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenCalledWith(
        dayPlan.tasks[0].id,
        expect.objectContaining({
          title: "Refined task",
          priority: dayPlan.tasks[0].priority,
          status: "planned",
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: /start timer/i }));
    expect(onStartTimer).toHaveBeenCalledWith(dayPlan.tasks[0].id);
  });

  it("deletes the selected task after confirmation", async () => {
    const user = userEvent.setup();
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<PlannerPage {...buildPlannerPageProps({ onDeleteTask })} />);

    await user.click(screen.getByRole("button", { name: /delete task/i }));

    await waitFor(() => {
      expect(onDeleteTask).toHaveBeenCalledWith("task-1f8f9660-0000-4000-8000-000000000001");
    });
  });

  it("advances task detail to the next visible queue task after a left-side delete", async () => {
    const user = userEvent.setup();
    const dayPlan = buildDayPlan();
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const props = buildPlannerPageProps({ onDeleteTask });
    const { rerender } = render(<PlannerPage {...props} dayPlan={dayPlan} />);

    await user.click(screen.getByRole("button", { name: /delete plan launch week/i }));

    await waitFor(() => {
      expect(onDeleteTask).toHaveBeenCalledWith(dayPlan.tasks[0].id);
    });

    rerender(
      <PlannerPage
        {...props}
        dayPlan={{
          ...dayPlan,
          tasks: [dayPlan.tasks[1]],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Detail title")).toHaveValue(dayPlan.tasks[1].title);
    });
    expect(confirmSpy).toHaveBeenCalledWith(`Delete "${dayPlan.tasks[0].title}"?`);
  });

  it("clears task detail instead of falling back to a hidden scheduled task after a left-side delete", async () => {
    const user = userEvent.setup();
    const dayPlan = buildDayPlan({
      tasks: [
        buildTask({
          id: "task-queue-1f8f9660-0000-4000-8000-000000000001",
          title: "Queue task",
        }),
        buildTask({
          id: "task-scheduled-1f8f9660-0000-4000-8000-000000000002",
          title: "Scheduled task",
          status: "scheduled",
          scheduledBlockId: "block-1f8f9660-0000-4000-8000-000000000001",
        }),
      ],
    });
    const onDeleteTask = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const props = buildPlannerPageProps({ onDeleteTask });
    const { rerender } = render(<PlannerPage {...props} dayPlan={dayPlan} />);

    await user.click(screen.getByRole("button", { name: /delete queue task/i }));

    await waitFor(() => {
      expect(onDeleteTask).toHaveBeenCalledWith(dayPlan.tasks[0].id);
    });

    rerender(
      <PlannerPage
        {...props}
        dayPlan={{
          ...dayPlan,
          tasks: [dayPlan.tasks[1]],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("Detail title")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Select a task to refine notes, priority, lifecycle, and timers.")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Scheduled task")).not.toBeInTheDocument();
  });

  it("removes retired planner chrome copy from the planner page", () => {
    render(<PlannerPage {...buildPlannerPageProps()} />);

    expect(screen.queryByText("Toggl live")).not.toBeInTheDocument();
    expect(screen.queryByText("Google live")).not.toBeInTheDocument();
    expect(screen.queryByText("Tunnel ready")).not.toBeInTheDocument();
    expect(screen.queryByText("No pending AI drafts. MCP proposals will land here for approval.")).not.toBeInTheDocument();
  });

  it("renders the refreshed planner header", () => {
    render(<PlannerPage {...buildPlannerPageProps()} />);

    expect(screen.getByRole("heading", { name: "Focus on what matters today." })).toBeInTheDocument();
    expect(screen.queryByText("Timebox the right work, then protect it.")).not.toBeInTheDocument();
  });

  it("defaults the activity panel to the timer tab", () => {
    render(<PlannerPage {...buildPlannerPageProps()} />);

    expect(
      screen.getByText("No timer is running. Start one from the selected task."),
    ).toBeInTheDocument();
  });

  it("shows the running task and project name in the timer section", () => {
    const dayPlan = buildDayPlan();
    const task = dayPlan.tasks[0];
    task.togglProjectId = "project-2";
    dayPlan.activeTimer = {
      id: "timer-1",
      taskId: task.id,
      calendarEventId: null,
      togglEntryId: null,
      startedAt: "2026-04-06T09:00:00.000Z",
      endedAt: null,
      durationSeconds: null,
      source: "manual",
    };

    render(<PlannerPage {...buildPlannerPageProps({ dayPlan })} />);

    expect(screen.getAllByText(`${task.title} (Client X / Bugfix)`).length).toBeGreaterThan(0);
  });

  it("renders the inline timer above delete when the selected task is running", () => {
    const dayPlan = buildDayPlan();
    const task = dayPlan.tasks[0];
    dayPlan.activeTimer = {
      id: "timer-2",
      taskId: task.id,
      calendarEventId: null,
      togglEntryId: null,
      startedAt: "2026-04-06T09:00:00.000Z",
      endedAt: null,
      durationSeconds: null,
      source: "manual",
    };

    render(<PlannerPage {...buildPlannerPageProps({ dayPlan })} />);

    const stopButtons = screen.getAllByRole("button", { name: /stop active timer/i });
    expect(stopButtons.length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(`${task.title} (Without project)`).length).toBeGreaterThanOrEqual(2);
  });

  it("uses 'Without project' as the project dropdown placeholder when Toggl is connected with no default", () => {
    const togglSettings = buildTogglSettings({ defaultProjectId: null, defaultProjectName: null });

    render(<PlannerPage {...buildPlannerPageProps({ togglSettings })} />);

    const dropdown = screen.getByLabelText("Detail Toggl project") as HTMLSelectElement;
    const emptyOption = Array.from(dropdown.options).find((option) => option.value === "");
    expect(emptyOption?.textContent).toBe("Without project");
    expect(screen.queryByText("No project override")).not.toBeInTheDocument();
  });

  it("shows an error when saving task details fails", async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn().mockRejectedValue(new Error("Schedule conflict with Standup"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<PlannerPage {...buildPlannerPageProps({ onUpdateTask })} />);

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Tasks can\'t overlap on the timeline. This change would overlap with "Standup". Shorten or move this task, or clear the conflicting event first.',
      );
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Tasks can\'t overlap on the timeline. This change would overlap with "Standup". Shorten or move this task, or clear the conflicting event first.',
      expect.any(Error),
    );
  });
});
