import { render, screen } from "@testing-library/react";
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
});
