import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DurationInput } from "@/components/duration-input";

describe("DurationInput", () => {
  it("gives the minutes field more room while keeping the compact numeric padding", () => {
    const { container } = render(
      <DurationInput valueMinutes={95} onChange={vi.fn()} ariaLabelPrefix="Task" />,
    );

    expect(container.firstChild).toHaveClass("grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]", "gap-3");
    expect(screen.getByLabelText("Task estimated hours")).toHaveClass("min-w-0", "px-3");
    expect(screen.getByLabelText("Task estimated minutes")).toHaveClass("min-w-0", "px-3");
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("35")).toBeInTheDocument();
  });
});

// comment
