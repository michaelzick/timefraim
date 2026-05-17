import { useEffect } from "react";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useTheme } from "@/theme/use-theme";

// Reconciles the theme render cache (localStorage/cookie, read pre-paint by
// index.html) with the database, which is the source of truth.
export function ThemeSync() {
  const { theme, setTheme } = useTheme();
  const { preferences } = useUserPreferences();

  useEffect(() => {
    if (preferences && preferences.theme !== theme) {
      setTheme(preferences.theme);
    }
  }, [preferences, theme, setTheme]);

  return null;
}
