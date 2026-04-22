import type { AuthSession } from "@timefraim/shared";
import { CalendarDays, LogOut, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

type AppHeaderProps = {
  authSession: AuthSession;
  onSignOut: () => void;
};

export function AppHeader({ authSession, onSignOut }: AppHeaderProps) {
  const linkedGoogleEmail = authSession.integrationStatus.googleEmail ?? authSession.user.email;

  return (
    <header className="flex flex-col gap-4 rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel-elevated)] p-6 shadow-[var(--shadow-elevated)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <div>
        <Badge>Synced with {linkedGoogleEmail}</Badge>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--heading)]">TimeFraim</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${isActive ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)]"}`
            }
          >
            <CalendarDays className="h-4 w-4" />
            Planner
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${isActive ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted)]"}`
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
