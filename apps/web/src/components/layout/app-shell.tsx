import type {
  AuthSession,
  DayPlan,
  TogglConnect,
  TogglDiscoverInput,
  TogglDiscoverResult,
  TogglIntegrationSettings,
} from "@timefraim/shared";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import type { PlannerPageProps } from "@/features/planner/types";

const PlannerPage = lazy(async () => ({
  default: (await import("@/pages/planner-page")).PlannerPage,
}));

const SettingsPage = lazy(async () => ({
  default: (await import("@/pages/settings-page")).SettingsPage,
}));

type AppShellProps = {
  authSession: AuthSession;
  date: string;
  dayPlan: DayPlan;
  togglSettings: TogglIntegrationSettings;
  isDiscoveringToggl: boolean;
  isSavingToggl: boolean;
  onDateChange: (nextDate: string) => void;
  onDiscoverToggl: (values: TogglDiscoverInput) => Promise<TogglDiscoverResult>;
  onDeleteToggl: () => Promise<TogglIntegrationSettings>;
  onSaveToggl: (values: TogglConnect) => Promise<TogglIntegrationSettings>;
  onSignOut: () => void;
  plannerPageProps: Omit<PlannerPageProps, "date" | "dayPlan" | "onDateChange">;
};

function RouteLoader() {
  return (
    <div className="flex min-h-[480px] items-center justify-center">
      <LoaderCircle className="h-8 w-8 animate-spin text-[var(--accent)]" />
    </div>
  );
}

export function AppShell({
  authSession,
  date,
  dayPlan,
  togglSettings,
  isDiscoveringToggl,
  isSavingToggl,
  onDateChange,
  onDiscoverToggl,
  onDeleteToggl,
  onSaveToggl,
  onSignOut,
  plannerPageProps,
}: AppShellProps) {
  return (
    <div className="min-h-screen px-5 py-6 md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <AppHeader authSession={authSession} onSignOut={onSignOut} />
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <PlannerPage
                  {...plannerPageProps}
                  date={date}
                  dayPlan={dayPlan}
                  onDateChange={onDateChange}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  authSession={authSession}
                  togglSettings={togglSettings}
                  isDiscovering={isDiscoveringToggl}
                  onSaveToggl={onSaveToggl}
                  onDiscoverToggl={onDiscoverToggl}
                  onDeleteToggl={onDeleteToggl}
                  isSaving={isSavingToggl}
                />
              }
            />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
