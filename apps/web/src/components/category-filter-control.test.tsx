import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryFilterControl } from "@/components/category-filter-control";

describe("CategoryFilterControl", () => {
  it("names every option even when its visible label is hidden on small screens", () => {
    render(<CategoryFilterControl value="all" onChange={vi.fn()} ariaLabel="Filter tasks by category" />);

    const group = screen.getByRole("group", { name: "Filter tasks by category" });

    expect(group).toBeInTheDocument();
    for (const name of ["All", "Personal", "Work"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("marks only the current option as pressed, using the readable accent color", () => {
    render(<CategoryFilterControl value="personal" onChange={vi.fn()} ariaLabel="Filter" />);

    const active = screen.getByRole("button", { name: "Personal" });
    const inactive = screen.getByRole("button", { name: "Work" });

    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(active).toHaveClass("text-[var(--accent-text)]");
    expect(active).not.toHaveClass("text-[var(--accent)]");
    expect(inactive).toHaveAttribute("aria-pressed", "false");
    expect(inactive).toHaveClass("text-[var(--muted)]", "hover:text-[var(--text)]");
  });

  it("gives options a visible keyboard focus indicator", () => {
    render(<CategoryFilterControl value="all" onChange={vi.fn()} ariaLabel="Filter" />);

    expect(screen.getByRole("button", { name: "Work" })).toHaveClass(
      "focus-visible:outline-2",
      "focus-visible:outline-[var(--accent-text)]",
    );
  });

  it("reports the chosen option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CategoryFilterControl value="all" onChange={onChange} ariaLabel="Filter" />);

    await user.click(screen.getByRole("button", { name: "Work" }));

    expect(onChange).toHaveBeenCalledWith("work");
  });
});
