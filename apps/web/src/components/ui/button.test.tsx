import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("applies pointer affordance to clickable CTAs", () => {
    render(<Button>Sync calendar</Button>);

    expect(screen.getByRole("button", { name: /sync calendar/i })).toHaveClass("cursor-pointer");
  });

  it("keeps accent buttons on the accent foreground token", () => {
    render(<Button>Sync calendar</Button>);

    expect(screen.getByRole("button", { name: /sync calendar/i })).toHaveClass("text-[var(--accent-foreground)]");
  });
});
