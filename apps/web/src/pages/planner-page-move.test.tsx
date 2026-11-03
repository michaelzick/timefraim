import type { ComponentProps } from "react";
import type { ScheduleBlock } from "@timefraim/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { getTimezoneOffsetForDate } from "@/lib/utils";
import { PlannerPage } from "@/pages/planner-page";
import { buildDayPlan, buildTask, buildTogglSettings, noopDuplicate } from "@/test/fixtures";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
  Toaster: () => null,
}));

const noopAsync = () => Promise.resolve(undefined);

function localIso(value: string) {
  return new Date(value).toISOString();
}

const block: ScheduleBlock = {
  id: "block-1",
  taskId: "task-1",
  startAt: localIso("2026-04-06T09:00:00"),
  endAt: localIso("2026-04-06T10:00:00"),
  source: "manual",
  state: "confirmed",
  googleEventId: null,
  createdAt: "2026-04-06T08:00:00.000Z",
  updatedAt: "2026-04-06T08:00:00.000Z",
};

const scheduledTask = buildTask({
  id: "task-1",
  title: "Focused work",
  status: "scheduled",
  scheduledBlockId: block.id,
  scheduledStartAt: block.startAt,
  scheduledEndAt: block.endAt,
});

function renderPlanner(overrides: Partial<ComponentProps<typeof PlannerPage>> = {}) {
  const onUpdateScheduleBlock = vi.fn().mockResolvedValue(undefined);
  const onDateChange = vi.fn();

  render(
    <MemoryRouter>
      <PlannerPage
        date="2026-04-06"
        dayPlan={buildDayPlan({ tasks: [scheduledTask], scheduleBlocks: [block] })}
        isMutating={false}
        isSyncing={false}
        linkedGoogleEmail="allowed@example.com"
        onDateChange={onDateChange}
        onCreateTask={noopAsync}
        onUpdateTask={noopAsync}
        onDeleteTask={noopAsync}
        onCreateScheduleBlock={noopAsync}
        onUpdateScheduleBlock={onUpdateScheduleBlock}
        onDeleteScheduleBlock={noopAsync}
        onDismissCalendarEvent={noopAsync}
        onUpdateCalendarEvent={noopAsync}
        onDuplicateTask={noopDuplicate}
        onDuplicateScheduleBlock={noopDuplicate}
        onStartTimer={noopAsync}
        onStartEventTimer={noopAsync}
        onStopTimer={noopAsync}
        onSyncCalendar={noopAsync}
        togglSettings={buildTogglSettings()}
        {...overrides}
      />
    </MemoryRouter>,
  );

  return { onDateChange, onUpdateScheduleBlock };
}

async function openMoveDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /more actions for focused work/i }));
  await user.click(await screen.findByRole("menuitem", { name: /move to date/i }));
  return screen.findByRole("dialog", { name: /move to date/i });
}

describe("PlannerPage move to date", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
  });

  it("moves a timeline task to another date and keeps its time", async () => {
    const user = userEvent.setup();
    const { onUpdateScheduleBlock } = renderPlanner();

    await openMoveDialog(user);
    expect(screen.getByLabelText("Date")).toHaveValue("2026-04-06");
    expect(screen.getByLabelText("Start time")).toHaveValue("09:00");

    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-08" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => {
      expect(onUpdateScheduleBlock).toHaveBeenCalledWith(block.id, {
        startAt: localIso("2026-04-08T09:00:00"),
        endAt: localIso("2026-04-08T10:00:00"),
        plannerDate: "2026-04-08",
        tzOffsetMinutes: getTimezoneOffsetForDate("2026-04-08"),
      });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("opens the target day from the toast's View day action", async () => {
    const user = userEvent.setup();
    const { onDateChange } = renderPlanner();

    await openMoveDialog(user);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-08" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const options = vi.mocked(toast.success).mock.calls[0][1] as unknown as { action: { onClick: () => void } };
    options.action.onClick();

    expect(onDateChange).toHaveBeenCalledWith("2026-04-08");
  });

  it("keeps the dialog open and names the task when the time is taken", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const otherTask = buildTask({
      id: "task-2",
      title: "Review roadmap",
      status: "scheduled",
      scheduledBlockId: "block-2",
      scheduledStartAt: localIso("2026-04-08T09:30:00"),
      scheduledEndAt: localIso("2026-04-08T10:30:00"),
    });
    const { onUpdateScheduleBlock } = renderPlanner({
      dayPlan: buildDayPlan({ tasks: [scheduledTask, otherTask], scheduleBlocks: [block] }),
    });

    await openMoveDialog(user);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-08" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/would overlap with "Review roadmap"/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "13:00" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => expect(onUpdateScheduleBlock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    consoleError.mockRestore();
  });

  it("keeps the dialog open when the server rejects the move", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderPlanner({
      onUpdateScheduleBlock: vi.fn().mockRejectedValue(new Error("Schedule conflict with Team sync")),
    });

    await openMoveDialog(user);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-08" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/would overlap with "Team sync"/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("closes without a request when nothing changed", async () => {
    const user = userEvent.setup();
    const { onUpdateScheduleBlock } = renderPlanner();

    await openMoveDialog(user);
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
  });

  it("clears the selection when the selected task leaves this day", async () => {
    const user = userEvent.setup();
    renderPlanner();

    await user.click(screen.getByText("Focused work"));
    expect(screen.getByLabelText("Detail title")).toHaveValue("Focused work");

    await openMoveDialog(user);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-08" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => expect(screen.queryByLabelText("Detail title")).not.toBeInTheDocument());
  });

  it("keeps the selection when only the time changes", async () => {
    const user = userEvent.setup();
    renderPlanner();

    await user.click(screen.getByText("Focused work"));
    await openMoveDialog(user);
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "13:00" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Detail title")).toHaveValue("Focused work");
  });

  it("leaves the page interactive after cancelling", async () => {
    const user = userEvent.setup();
    renderPlanner();

    await openMoveDialog(user);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
  });

  it("leaves the page interactive after a successful move", async () => {
    const user = userEvent.setup();
    renderPlanner();

    await openMoveDialog(user);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-08" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
  });
});
