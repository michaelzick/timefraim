export const THEME_STORAGE_KEY = "ui-theme";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemeMode, "system">;

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function readThemePreference(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(stored)) {
      return stored;
    }
  } catch {
    // ignore storage access failures
  }

  return "system";
}

export function persistThemePreference(theme: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage access failures
  }

  try {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    document.cookie = `${THEME_STORAGE_KEY}=${encodeURIComponent(theme)}; expires=${expiresAt.toUTCString()}; path=/`;
  } catch {
    // ignore cookie access failures
  }
}

export function getSystemResolvedTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(theme: ThemeMode): ResolvedTheme {
  return theme === "system" ? getSystemResolvedTheme() : theme;
}

export function getDocumentResolvedTheme(): ResolvedTheme | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  if (document.documentElement.classList.contains("light")) {
    return "light";
  }

  return null;
}

export function applyResolvedTheme(resolvedTheme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;
}
