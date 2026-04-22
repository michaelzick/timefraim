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
});
