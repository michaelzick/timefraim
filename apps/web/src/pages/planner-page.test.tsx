import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { PlannerPage } from "@/pages/planner-page";
import { buildDayPlan, buildTask, buildTogglSettings, noopDuplicate } from "@/test/fixtures";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock("@/components/timeline-board", () => ({
  TimelineBoard: ({
    calendarEvents,
    selectedCalendarEventId,
    onDismissCalendarEvent,
    onSelectCalendarEvent,
  }: {
    calendarEvents: Array<{ id: string; title: string }>;
    selectedCalendarEventId: string | null;
    onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
    onSelectCalendarEvent: (calendarEventId: string) => void;
  }) => (
    <div>
      <div>timeline board</div>
      <div data-testid="selected-calendar-event">{selectedCalendarEventId ?? "none"}</div>
      {calendarEvents[0] ? (
        <>
          <button type="button" onClick={() => onSelectCalendarEvent(calendarEvents[0].id)}>
            Select calendar event
          </button>
          <button
            type="button"
            onClick={() => onDismissCalendarEvent(calendarEvents[0].id, calendarEvents[0].title)}
          >
            Hide calendar event
          </button>
        </>
      ) : null}
    </div>
  ),
}));

const noopAsync = () => Promise.resolve(undefined);

function buildPlannerPageProps(overrides: Partial<ComponentProps<typeof PlannerPage>> = {}) {
  return {
    date: "2026-04-06",
    dayPlan: buildDayPlan(),
    isMutating: false,
    isSyncing: false,
    linkedGoogleEmail: "allowed@example.com",
    onDateChange: vi.fn(),
    onCreateTask: noopAsync,
    onUpdateTask: noopAsync,
    onDeleteTask: noopAsync,
    onCreateScheduleBlock: noopAsync,
    onUpdateScheduleBlock: noopAsync,
    onDeleteScheduleBlock: noopAsync,
    onDismissCalendarEvent: noopAsync,
    onUpdateCalendarEvent: noopAsync,
    onDuplicateTask: noopDuplicate,
    onDuplicateScheduleBlock: noopDuplicate,
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

    const addTaskButton = screen.getByRole("button", { name: /add task/i });

    expect(addTaskButton).toBeDisabled();

    await user.type(screen.getByLabelText("Task title"), "  Deep work  ");
    expect(addTaskButton).toBeEnabled();

    await user.type(screen.getByLabelText("Task notes"), "Protect a quiet block.");
    const taskPresets = screen.getByRole("group", { name: /task common durations/i });
    await user.click(within(taskPresets).getByRole("button", { name: "45 min" }));
    expect(screen.getByLabelText("Task estimated hours")).toHaveValue(0);
    expect(screen.getByLabelText("Task estimated minutes")).toHaveValue(45);
    await user.selectOptions(screen.getByLabelText("Task priority"), "high");
    await user.click(addTaskButton);

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        title: "Deep work",
        notes: "Protect a quiet block.",
        estimatedMinutes: 45,
        priority: "high",
        status: "planned",
        togglProjectId: null,
        plannerDate: "2026-04-06",
      });
    });
    expect(screen.getByLabelText("Task title")).toHaveValue("");
    expect(screen.getByLabelText("Task notes")).toHaveValue("");
  });

  it("keeps task creation disabled for blank or whitespace-only titles", async () => {
    const user = userEvent.setup();
    const onCreateTask = vi.fn().mockResolvedValue(undefined);

    render(<PlannerPage {...buildPlannerPageProps({ onCreateTask })} />);

    const titleInput = screen.getByLabelText("Task title");
    const addTaskButton = screen.getByRole("button", { name: /add task/i });

    expect(addTaskButton).toBeDisabled();

    await user.type(titleInput, "   ");
    expect(addTaskButton).toBeDisabled();

    await user.click(addTaskButton);
    expect(onCreateTask).not.toHaveBeenCalled();
  });

  it("shows the refreshed task inbox copy without the retired chrome", () => {
    render(<PlannerPage {...buildPlannerPageProps()} />);

    expect(screen.getByPlaceholderText("Add a task")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Why this matters")).toBeInTheDocument();
    expect(screen.queryByText("Capture")).not.toBeInTheDocument();
    expect(screen.queryByText("2 total")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Next commitment")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Why this matters right now")).not.toBeInTheDocument();
  });

  it("collapses and expands the task inbox without hiding the queue below it", async () => {
    const user = userEvent.setup();

    render(<PlannerPage {...buildPlannerPageProps()} />);

    const toggle = screen.getByRole("button", { name: /task inbox/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Task title")).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Task title")).not.toBeInTheDocument();
    expect(screen.getByText("Plan launch week")).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Task title")).toBeInTheDocument();
  });

  it("shows an error and keeps the form values when task creation fails", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onCreateTask = vi.fn().mockRejectedValue(new Error("Create failed"));

    render(<PlannerPage {...buildPlannerPageProps({ onCreateTask })} />);

    await user.type(screen.getByLabelText("Task title"), "Deep work");
    await user.type(screen.getByLabelText("Task notes"), "Protect a quiet block.");
    await user.click(screen.getByRole("button", { name: /add task/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to create the task. Please try again.",
        { duration: 8000 },
      );
    });
    expect(screen.getByLabelText("Task title")).toHaveValue("Deep work");
    expect(screen.getByLabelText("Task notes")).toHaveValue("Protect a quiet block.");

    consoleErrorSpy.mockRestore();
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

    await user.click(screen.getByRole("button", { name: /more actions for plan launch week/i }));
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));

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

    await user.click(screen.getByRole("button", { name: /more actions for queue task/i }));
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));

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

  it("renders the planner toolbar controls and queue filter", () => {
    render(<PlannerPage {...buildPlannerPageProps()} />);

    const toolbar = screen.getByRole("region", { name: /planner toolbar/i });

    expect(toolbar).toBeInTheDocument();
    expect(screen.getByLabelText("Planner date")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jump to today/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync calendar/i })).toBeInTheDocument();
    expect(screen.getByText(/synced with allowed@example.com/i)).toBeInTheDocument();
    expect(within(toolbar).queryByText("Task queue")).not.toBeInTheDocument();
    expect(screen.getByText("Task queue")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Search tasks" })).toHaveAttribute("placeholder", "Search tasks");
    expect(screen.queryByRole("heading", { name: "Focus on what matters today." })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tasks ready to place" })).not.toBeInTheDocument();
  });

  it("jumps to the current date from the toolbar", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0));
      const onDateChange = vi.fn();

      render(<PlannerPage {...buildPlannerPageProps({ date: "2026-04-06", onDateChange })} />);

      fireEvent.click(screen.getByRole("button", { name: /jump to today/i }));

      expect(onDateChange).toHaveBeenCalledWith("2026-04-20");
    } finally {
      vi.useRealTimers();
    }
  });

  it("disables the Today button when the viewed date is already today", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0));

      render(<PlannerPage {...buildPlannerPageProps({ date: "2026-04-20" })} />);

      expect(screen.getByRole("button", { name: /jump to today/i })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides the timer panel when no timer is running", () => {
    render(<PlannerPage {...buildPlannerPageProps()} />);

    expect(screen.queryByText("No timer running — pick a task to start one.")).not.toBeInTheDocument();
    expect(screen.queryByText("Running")).not.toBeInTheDocument();
  });

  it("renders the activity log without tabs in the right rail", () => {
    render(<PlannerPage {...buildPlannerPageProps()} />);

    expect(screen.getByRole("heading", { name: /Recent changes/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Timer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Activity" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Drafts" })).not.toBeInTheDocument();
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

  it("surfaces the active timer panel and detail Stop control when the selected task is running", () => {
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

    const stopButtons = screen.getAllByRole("button", { name: /stop timer/i });
    expect(stopButtons.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(`${task.title} (Without project)`)).toBeInTheDocument();
    expect(screen.getAllByText("Running").length).toBeGreaterThanOrEqual(2);
  });

  it("uses 'Without project' as the project dropdown placeholder when Toggl is connected with no default", () => {
    const togglSettings = buildTogglSettings({ defaultProjectId: null, defaultProjectName: null });

    render(<PlannerPage {...buildPlannerPageProps({ togglSettings })} />);

    const dropdown = screen.getByLabelText("Detail Toggl project");
    const emptyOption = Array.from(
      dropdown instanceof HTMLSelectElement ? dropdown.options : [],
    ).find((option) => option.value === "");
    expect(emptyOption?.textContent).toBe("Without project");
    expect(screen.queryByText("No project override")).not.toBeInTheDocument();
  });

  it("shows an error when saving task details fails", async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn().mockRejectedValue(new Error("Schedule conflict with Standup"));
    const toastErrorSpy = vi.mocked(toast.error);
    toastErrorSpy.mockClear();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<PlannerPage {...buildPlannerPageProps({ onUpdateTask })} />);

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith(
        'Tasks can\'t overlap on the timeline. This change would overlap with "Standup". Shorten or move this task, or clear the conflicting event first.',
        { duration: 8000 },
      );
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Tasks can\'t overlap on the timeline. This change would overlap with "Standup". Shorten or move this task, or clear the conflicting event first.',
      expect.any(Error),
    );
  });

  it("restores task selection immediately after hiding the selected calendar event", async () => {
    const user = userEvent.setup();
    const onDismissCalendarEvent = vi.fn().mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const dayPlan = buildDayPlan({
      calendarEvents: [
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
      ],
    });

    render(<PlannerPage {...buildPlannerPageProps({ dayPlan, onDismissCalendarEvent })} />);

    await user.click(screen.getByRole("button", { name: /select calendar event/i }));
    expect(screen.getByRole("heading", { name: "Calendar event" })).toBeInTheDocument();
    expect(screen.getByTestId("selected-calendar-event")).toHaveTextContent("calendar-1");

    await user.click(screen.getByRole("button", { name: /hide calendar event/i }));

    await waitFor(() => {
      expect(onDismissCalendarEvent).toHaveBeenCalledWith("calendar-1");
    });
    expect(confirmSpy).toHaveBeenCalledWith(
      'Hide "Team sync" from the planner timeline until it changes in Google Calendar?',
    );
    expect(screen.getByRole("button", { name: /task detail/i })).toBeInTheDocument();
    expect(screen.getByTestId("selected-calendar-event")).toHaveTextContent("none");
  });
});
