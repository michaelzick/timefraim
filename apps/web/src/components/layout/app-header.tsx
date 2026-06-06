import { CalendarDays, Kanban, LogOut, Settings2 } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

type AppHeaderProps = {
  onSignOut: () => void;
};

export function AppHeader({ onSignOut }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-elevated)] px-4 py-4 shadow-[var(--shadow-elevated)] backdrop-blur-xl md:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <img src="/img/timefraim-logo-tf.webp" alt="TimeFraim" className="h-8 w-auto rounded-lg" />
          <h1 className="text-2xl font-semibold text-[var(--heading)]">TimeFraim</h1>
        </Link>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <nav className="grid w-full grid-cols-3 gap-1 rounded-full border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-1 sm:w-auto sm:flex sm:items-center sm:gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition sm:px-4 ${isActive ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_30px_rgba(255,111,59,0.35)] hover:brightness-105" : "text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--heading)]"}`
            }
          >
            <CalendarDays className="h-4 w-4" />
            Planner
          </NavLink>
          <NavLink
            to="/board"
            className={({ isActive }) =>
              `inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition sm:px-4 ${isActive ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_30px_rgba(255,111,59,0.35)] hover:brightness-105" : "text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--heading)]"}`
            }
          >
            <Kanban className="h-4 w-4" />
            Board
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition sm:px-4 ${isActive ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_30px_rgba(255,111,59,0.35)] hover:brightness-105" : "text-[var(--muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--heading)]"}`
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
