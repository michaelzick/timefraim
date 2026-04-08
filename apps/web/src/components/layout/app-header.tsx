import type { AuthSession } from "@timefraim/shared";
import { CalendarDays, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  authSession: AuthSession;
  onSignOut: () => void;
};

export function AppHeader({ authSession, onSignOut }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-[rgba(8,12,24,0.82)] p-6 shadow-[0_24px_80px_rgba(5,8,18,0.55)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <div>
        <Badge>Allowlisted for {authSession.user.email}</Badge>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">TimeFraim</h1>
          <span className="text-sm text-[var(--muted-strong)]">Calendar-aware daily planning with guarded AI writes</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 p-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${isActive ? "bg-[var(--accent)] text-[var(--surface)]" : "text-[var(--muted)]"}`
            }
          >
            <CalendarDays className="h-4 w-4" />
            Planner
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${isActive ? "bg-[var(--accent)] text-[var(--surface)]" : "text-[var(--muted)]"}`
            }
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </NavLink>
        </nav>
        <Button variant="secondary" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
