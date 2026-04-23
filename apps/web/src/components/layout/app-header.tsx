import { CalendarDays, LogOut, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

type AppHeaderProps = {
  onSignOut: () => void;
};

export function AppHeader({ onSignOut }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-elevated)] px-6 py-4 shadow-[var(--shadow-elevated)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--heading)]">TimeFraim</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_30px_rgba(255,111,59,0.35)] hover:brightness-105" : "text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--heading)]"}`
            }
          >
            <CalendarDays className="h-4 w-4" />
            Planner
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_30px_rgba(255,111,59,0.35)] hover:brightness-105" : "text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--heading)]"}`
            }
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </NavLink>
        </nav>
        <ThemeSwitcher />
        <Button type="button" variant="ghost" size="sm" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
