import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");

function getThemeBlock(theme: "light" | "dark") {
  const match = globalsCss.match(new RegExp(`html\\.${theme} \\{([\\s\\S]*?)\\n\\}`));
  return match?.[1] ?? "";
}

describe("globals.css planner tokens", () => {
  it("keeps the light theme priority palette aligned with dark mode", () => {
    const lightThemeBlock = getThemeBlock("light");

    expect(lightThemeBlock).toContain("--priority-low-block: #2f347c;");
    expect(lightThemeBlock).toContain("--priority-medium-block: #0a6f79;");
    expect(lightThemeBlock).toContain("--priority-high-block: #7c1f1f;");
    expect(lightThemeBlock).toContain("--priority-urgent-block: #8d1b63;");
    expect(lightThemeBlock).toContain("--priority-low-card: #242b63;");
    expect(lightThemeBlock).toContain("--priority-medium-card: #084f58;");
    expect(lightThemeBlock).toContain("--priority-high-card: #5c1717;");
    expect(lightThemeBlock).toContain("--priority-urgent-card: #641246;");
  });

  it("defines the new planner surface and light-mode accent tokens", () => {
    const lightThemeBlock = getThemeBlock("light");
    const darkThemeBlock = getThemeBlock("dark");

    expect(globalsCss).toContain("--planner-surface-title: #f8f8f7;");
    expect(globalsCss).toContain("--planner-surface-meta: #c8d1eb;");
    expect(globalsCss).toContain("--timeline-selection-ring: #ffffff;");
    expect(darkThemeBlock).toContain("--calendar-event-title: var(--planner-surface-title);");
    expect(darkThemeBlock).toContain("--calendar-event-meta: var(--planner-surface-meta);");
    expect(lightThemeBlock).toContain("--calendar-event-title: var(--heading);");
    expect(lightThemeBlock).toContain("--calendar-event-meta: var(--muted-strong);");
    expect(lightThemeBlock).toContain("--accent-foreground: #ffffff;");
  });
});
