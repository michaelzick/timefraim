import type { ScheduleBlock } from "@timefraim/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MoveTaskDialog } from "@/features/planner/move-task-dialog";
import { buildTask } from "@/test/fixtures";

const block: ScheduleBlock = {
  id: "block-1",
  taskId: "task-1",
  startAt: new Date("2026-04-06T09:30:00").toISOString(),
  endAt: new Date("2026-04-06T10:30:00").toISOString(),
  source: "manual",
  state: "confirmed",
  googleEventId: null,
  createdAt: "2026-04-06T08:00:00.000Z",
  updatedAt: "2026-04-06T08:00:00.000Z",
};

function renderDialog(onSubmit = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) {
  render(
    <MoveTaskDialog
      target={{ block, task: buildTask({ title: "Focused work" }) }}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );
  return { onClose, onSubmit };
}

describe("MoveTaskDialog", () => {
  it("fills in the block's current date and time", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: /move to date/i })).toBeInTheDocument();
    expect(screen.getByText("Focused work")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue("2026-04-06");
    expect(screen.getByLabelText("Start time")).toHaveValue("09:30");
  });

  it("submits the chosen date and time", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-04-08" } });
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "14:15" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ date: "2026-04-08", time: "14:15" });
    });
  });

  it("rejects a start time before the timeline begins", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "03:45" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/timeline starts at 4:00 AM/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("accepts the first minute of the timeline", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "04:00" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("requires a date", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/pick a date/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("stays open with an explanation when the move conflicts", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { onClose } = renderDialog(vi.fn().mockRejectedValue(new Error("Schedule conflict with Team sync")));

    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/would overlap with "Team sync"/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("shows a retry message for other failures", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderDialog(vi.fn().mockRejectedValue(new Error("Network down")));

    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/failed to move the task/i);
    consoleError.mockRestore();
  });

  it("closes from Cancel without submitting", async () => {
    const user = userEvent.setup();
    const { onClose, onSubmit } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
