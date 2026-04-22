import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  applyResolvedTheme,
  getDocumentResolvedTheme,
  getSystemResolvedTheme,
  persistThemePreference,
  readThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "@/theme/theme-storage";

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialThemeState(): { theme: ThemeMode; resolvedTheme: ResolvedTheme } {
  const theme = typeof window === "undefined" ? "system" : readThemePreference();
  const resolvedTheme =
    getDocumentResolvedTheme()
    ?? (typeof window === "undefined" ? "light" : resolveTheme(theme));

  return { theme, resolvedTheme };
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [{ theme, resolvedTheme }, setThemeState] = useState(getInitialThemeState);

  useEffect(() => {
    const mediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

    const syncResolvedTheme = (nextTheme: ThemeMode) => {
      const nextResolvedTheme = nextTheme === "system"
        ? (mediaQuery?.matches ? "dark" : "light")
        : nextTheme;

      applyResolvedTheme(nextResolvedTheme);
      setThemeState((current) =>
        current.resolvedTheme === nextResolvedTheme && current.theme === nextTheme
          ? current
          : { theme: nextTheme, resolvedTheme: nextResolvedTheme }
      );
    };

    syncResolvedTheme(theme);

    if (theme !== "system" || !mediaQuery) {
      return undefined;
    }

    const handleChange = () => {
      syncResolvedTheme("system");
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (!mediaQuery) {
        return;
      }

      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme]);

  const setTheme = (nextTheme: ThemeMode) => {
    persistThemePreference(nextTheme);
    const nextResolvedTheme = nextTheme === "system" ? getSystemResolvedTheme() : nextTheme;
    applyResolvedTheme(nextResolvedTheme);
    setThemeState({ theme: nextTheme, resolvedTheme: nextResolvedTheme });
  };

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
