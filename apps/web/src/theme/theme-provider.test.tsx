import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { setMatchMediaTheme } from "@/test/match-media";
import { ThemeProvider } from "@/theme/theme-provider";
import { THEME_STORAGE_KEY } from "@/theme/theme-storage";
import { useTheme } from "@/theme/use-theme";

function ThemeHarness() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button type="button" onClick={() => setTheme("light")}>
        Light
      </button>
      <button type="button" onClick={() => setTheme("dark")}>
        Dark
      </button>
      <button type="button" onClick={() => setTheme("system")}>
        System
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("defaults to system mode and applies the current system theme", () => {
    setMatchMediaTheme("light");

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
    expect(document.documentElement).toHaveClass("light");
  });

  it("restores a saved theme preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("updates the html class and persistence when the user changes theme", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Dark" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("tracks live system theme changes while in system mode", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "System" }));
    act(() => {
      setMatchMediaTheme("dark");
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
