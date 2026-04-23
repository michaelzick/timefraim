import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { TaskDetailCard } from "@/features/planner/task-detail-card";
import { getTaskFormValues } from "@/features/planner/planner-page-utils";
import type { TaskFormValues } from "@/features/planner/types";
import { buildTask, buildTogglSettings } from "@/test/fixtures";

function Harness({ task = buildTask() }: { task?: ReturnType<typeof buildTask> }) {
  const form = useForm<TaskFormValues>({ values: getTaskFormValues(task) });
  return (
    <TaskDetailCard
      detailPanelRef={createRef<HTMLDivElement>()}
      form={form}
      selectedTask={task}
      activeTimerTaskId={null}
      isMutating={false}
      togglSettings={buildTogglSettings()}
      onDeleteTask={vi.fn()}
      onSaveTask={vi.fn().mockResolvedValue(undefined)}
      onStartTimer={vi.fn()}
      onStopTimer={vi.fn()}
    />
  );
}

describe("TaskDetailCard save button", () => {
  it("uses an opaque priority badge in the detail header", () => {
    render(<Harness task={buildTask({ priority: "urgent" })} />);

    const badge = screen.getAllByText("Urgent").find((element) => element.tagName === "SPAN");
    expect(badge).toBeDefined();
    expect(badge as HTMLElement).toHaveClass("bg-[var(--priority-urgent-card)]");
    expect(badge as HTMLElement).not.toHaveClass("bg-[var(--priority-urgent-soft)]");
  });

  it("uses the tinted ghost style when the form is pristine", () => {
    render(<Harness />);
    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton.className).toContain("text-[var(--accent)]");
    expect(saveButton.className).toContain("bg-[var(--accent-soft)]");
    expect(saveButton.querySelector("svg")).not.toBeNull();
  });

  it("switches to the full CTA when the form becomes dirty", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const titleInput = screen.getByLabelText(/detail title/i);

    await user.type(titleInput, " edited");

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton.className).not.toContain("bg-[var(--accent-soft)]");
    expect(saveButton.querySelector("svg")).not.toBeNull();
  });

  it("quick-selects common durations and marks the form dirty", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const presets = screen.getByRole("group", { name: /detail common durations/i });
    await user.click(within(presets).getByRole("button", { name: "1.5 hr" }));

    expect(screen.getByLabelText("Detail estimated hours")).toHaveValue(1);
    expect(screen.getByLabelText("Detail estimated minutes")).toHaveValue(30);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton.className).not.toContain("bg-[var(--accent-soft)]");
  });

  it("collapses and expands the detail body", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const toggle = screen.getByRole("button", { name: /task detail/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Detail title")).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Detail title")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Detail title")).toBeInTheDocument();
  });
});
