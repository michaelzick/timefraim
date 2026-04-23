import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/layout/app-header";
import { buildAuthSession } from "@/test/fixtures";
import { ThemeProvider } from "@/theme/theme-provider";

describe("AppHeader", () => {
  it("renders the sign out CTA like the theme button and keeps the icon", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();

    render(
      <ThemeProvider>
        <MemoryRouter>
          <AppHeader authSession={buildAuthSession()} onSignOut={onSignOut} />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    expect(signOutButton).toHaveClass("h-9", "px-3", "text-[var(--muted-strong)]");
    expect(signOutButton.querySelector("svg")).not.toBeNull();

    await user.click(signOutButton);

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the active planner nav pill on the accent foreground token", () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/"]}>
          <AppHeader authSession={buildAuthSession()} onSignOut={vi.fn()} />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByRole("link", { name: /planner/i })).toHaveClass("text-[var(--accent-foreground)]");
  });
});
