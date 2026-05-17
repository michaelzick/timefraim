import { Laptop, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "@timefraim/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useTheme } from "@/theme/use-theme";

function ThemeIcon({ theme }: { theme: "light" | "dark" | "system" }) {
  if (theme === "light") {
    return <Sun className="h-4 w-4" />;
  }

  if (theme === "dark") {
    return <Moon className="h-4 w-4" />;
  }

  return <Laptop className="h-4 w-4" />;
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { mutation } = useUserPreferences();

  const selectTheme = (mode: ThemeMode) => {
    setTheme(mode);
    mutation.mutate({ theme: mode });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label="Toggle theme">
          <ThemeIcon theme={theme} />
          Theme
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => selectTheme("light")}>
          <Sun className="h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => selectTheme("dark")}>
          <Moon className="h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => selectTheme("system")}>
          <Laptop className="h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
