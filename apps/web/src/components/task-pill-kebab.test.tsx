import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Undo2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { TaskPillKebab } from "@/components/task-pill-kebab";

describe("TaskPillKebab", () => {
  it("keeps Delete for queue items", async () => {
    const user = userEvent.setup();

    render(<TaskPillKebab label="Plan launch week" onDuplicate={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /more actions for plan launch week/i }));

    expect(await screen.findByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
  });

  it("shows Remove for timeline items", async () => {
    const user = userEvent.setup();

    render(
      <TaskPillKebab
        label="Plan launch week"
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        deleteLabel="Remove"
        deleteIcon={Undo2}
      />,
    );

    await user.click(screen.getByRole("button", { name: /more actions for plan launch week/i }));

    expect(await screen.findByRole("menuitem", { name: /remove/i })).toBeInTheDocument();
  });

  it("leaves out Move to date unless a handler is passed", async () => {
    const user = userEvent.setup();

    render(<TaskPillKebab label="Plan launch week" onDuplicate={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /more actions for plan launch week/i }));

    expect(await screen.findByRole("menuitem", { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /move to date/i })).not.toBeInTheDocument();
  });

  it("offers Move to date when a handler is passed", async () => {
    const user = userEvent.setup();
    const onMoveToDate = vi.fn();

    render(<TaskPillKebab label="Plan launch week" onDuplicate={vi.fn()} onMoveToDate={onMoveToDate} />);

    await user.click(screen.getByRole("button", { name: /more actions for plan launch week/i }));
    await user.click(await screen.findByRole("menuitem", { name: /move to date/i }));

    expect(onMoveToDate).toHaveBeenCalledTimes(1);
  });
});
