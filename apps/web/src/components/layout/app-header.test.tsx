import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/layout/app-header";
import { ThemeProvider } from "@/theme/theme-provider";

function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe("AppHeader", () => {
  it("renders the sign out CTA like the theme button and keeps the icon", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();

    render(
      <Providers>
        <MemoryRouter>
          <AppHeader onSignOut={onSignOut} />
        </MemoryRouter>
      </Providers>,
    );

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    expect(signOutButton).toHaveClass("h-9", "px-3", "text-[var(--muted-strong)]");
    expect(signOutButton.querySelector("svg")).not.toBeNull();

    await user.click(signOutButton);

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the active planner nav pill on the accent foreground token and removes the sync badge", () => {
    render(
      <Providers>
        <MemoryRouter initialEntries={["/"]}>
          <AppHeader onSignOut={vi.fn()} />
        </MemoryRouter>
      </Providers>,
    );

    expect(screen.getByRole("link", { name: /planner/i })).toHaveClass("text-[var(--accent-foreground)]");
    expect(screen.queryByText(/synced with/i)).not.toBeInTheDocument();
  });

  it("keeps the active settings nav pill on the accent foreground token", () => {
    render(
      <Providers>
        <MemoryRouter initialEntries={["/settings"]}>
          <AppHeader onSignOut={vi.fn()} />
        </MemoryRouter>
      </Providers>,
    );

    expect(screen.getByRole("link", { name: /settings/i })).toHaveClass("text-[var(--accent-foreground)]");
  });

  it("keeps the active board nav pill on the accent foreground token", () => {
    render(
      <Providers>
        <MemoryRouter initialEntries={["/board"]}>
          <AppHeader onSignOut={vi.fn()} />
        </MemoryRouter>
      </Providers>,
    );

    expect(screen.getByRole("link", { name: /board/i })).toHaveClass("text-[var(--accent-foreground)]");
  });
});
