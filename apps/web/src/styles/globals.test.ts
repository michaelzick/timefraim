import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8");

function getThemeBlock(theme: "light" | "dark") {
  const match = globalsCss.match(new RegExp(`html\\.${theme} \\{([\\s\\S]*?)\\n\\}`));
  return match?.[1] ?? "";
}

type Color = { r: number; g: number; b: number; a: number };

function readColor(theme: "light" | "dark", token: string): Color {
  const value = getThemeBlock(theme).match(new RegExp(`${token}: ([^;]+);`))?.[1] ?? "";
  const hex = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) {
    return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16), a: 1 };
  }
  const rgba = value.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
  if (rgba) {
    return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: Number(rgba[4]) };
  }
  throw new Error(`Unreadable color for ${token}: "${value}"`);
}

function composite(color: Color, background: Color): Color {
  return {
    r: color.r * color.a + background.r * (1 - color.a),
    g: color.g * color.a + background.g * (1 - color.a),
    b: color.b * color.a + background.b * (1 - color.a),
    a: 1,
  };
}

function luminance({ r, g, b }: Color) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: Color, second: Color) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("globals.css planner tokens", () => {
  it("keeps the light theme priority palette aligned with dark mode", () => {
    const lightThemeBlock = getThemeBlock("light");

    expect(lightThemeBlock).toContain("--priority-low-block: #2f347c;");
    expect(lightThemeBlock).toContain("--priority-medium-block: #0a6f79;");
    expect(lightThemeBlock).toContain("--priority-high-block: #692b8b;");
    expect(lightThemeBlock).toContain("--priority-urgent-block: #8d1b63;");
    expect(lightThemeBlock).toContain("--priority-low-card: #242b63;");
    expect(lightThemeBlock).toContain("--priority-medium-card: #084f58;");
    expect(lightThemeBlock).toContain("--priority-high-border: rgba(185, 124, 219, 0.52);");
    expect(lightThemeBlock).toContain("--priority-high-soft: rgba(185, 124, 219, 0.20);");
    expect(lightThemeBlock).toContain("--priority-high-card: #53226e;");
    expect(lightThemeBlock).toContain("--priority-high-text: #efccff;");
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

  it("gives each theme its own panel color instead of a shared dark one", () => {
    expect(getThemeBlock("dark")).toContain("--panel: #0f1527;");
    expect(getThemeBlock("light")).toContain("--panel: #ffffff;");
    expect(globalsCss.match(/:root \{([\s\S]*?)\n\}/)?.[1]).not.toContain("--panel:");
  });

  it.each([
    ["inactive text", "--muted", "--panel"],
    ["hovered text", "--text", "--panel-hover"],
    ["active text", "--accent-text", "--accent-soft"],
    ["hovered active text", "--accent-text", "--accent-soft-strong"],
  ])("meets WCAG AA contrast in light mode for segmented control %s", (_label, text, background) => {
    const panel = readColor("light", "--panel");
    const surface = composite(readColor("light", background), panel);

    expect(contrastRatio(composite(readColor("light", text), panel), surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the light-mode active indicator visible against the panel", () => {
    const panel = readColor("light", "--panel");

    expect(contrastRatio(composite(readColor("light", "--accent-ring"), panel), panel)).toBeGreaterThanOrEqual(3);
  });

  it("limits the anchor color reset to unclassed links", () => {
    expect(globalsCss).toContain("a:not([class]) {");
    expect(globalsCss).not.toContain("\na {\n  color: inherit;");
  });
});
