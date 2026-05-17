import type {
  AuthSession,
  DayPlan,
  GoogleCalendarSettings,
  GoogleCalendarSettingsUpdate,
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
  googleCalendarSettings: GoogleCalendarSettings | null;
  isDiscoveringToggl: boolean;
  isSavingToggl: boolean;
  isLoadingGoogleCalendars: boolean;
  isSavingGoogleCalendars: boolean;
  taskStartNotificationsEnabled: boolean;
  taskEndNotificationsEnabled: boolean;
  taskNotificationsSupported: boolean;
  taskNotificationsMessage: string | null;
  onDateChange: (nextDate: string) => void;
  onDiscoverToggl: (values: TogglDiscoverInput) => Promise<TogglDiscoverResult>;
  onDeleteToggl: () => Promise<TogglIntegrationSettings>;
  onSaveToggl: (values: TogglConnect) => Promise<TogglIntegrationSettings>;
  onSaveGoogleCalendars: (values: GoogleCalendarSettingsUpdate) => Promise<unknown>;
  onTaskStartNotificationsChange: (nextEnabled: boolean) => Promise<void> | void;
  onTaskEndNotificationsChange: (nextEnabled: boolean) => Promise<void> | void;
  onSignOut: () => void;
  plannerPageProps: Omit<PlannerPageProps, "date" | "dayPlan" | "linkedGoogleEmail" | "onDateChange">;
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
  googleCalendarSettings,
  isDiscoveringToggl,
  isSavingToggl,
  isLoadingGoogleCalendars,
  isSavingGoogleCalendars,
  taskStartNotificationsEnabled,
  taskEndNotificationsEnabled,
  taskNotificationsSupported,
  taskNotificationsMessage,
  onDateChange,
  onDiscoverToggl,
  onDeleteToggl,
  onSaveToggl,
  onSaveGoogleCalendars,
  onTaskStartNotificationsChange,
  onTaskEndNotificationsChange,
  onSignOut,
  plannerPageProps,
}: AppShellProps) {
  const linkedGoogleEmail = authSession.integrationStatus.googleEmail ?? authSession.user.email ?? null;

  return (
    <div className="min-h-screen px-5 py-6 md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <AppHeader onSignOut={onSignOut} />
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <PlannerPage
                  {...plannerPageProps}
                  date={date}
                  dayPlan={dayPlan}
                  linkedGoogleEmail={linkedGoogleEmail}
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
                  googleCalendarSettings={googleCalendarSettings}
                  isLoadingGoogleCalendars={isLoadingGoogleCalendars}
                  isSavingGoogleCalendars={isSavingGoogleCalendars}
                  isDiscovering={isDiscoveringToggl}
                  onSaveToggl={onSaveToggl}
                  onDiscoverToggl={onDiscoverToggl}
                  onDeleteToggl={onDeleteToggl}
                  onSaveGoogleCalendars={onSaveGoogleCalendars}
                  taskStartNotificationsEnabled={taskStartNotificationsEnabled}
                  taskEndNotificationsEnabled={taskEndNotificationsEnabled}
                  taskNotificationsSupported={taskNotificationsSupported}
                  taskNotificationsMessage={taskNotificationsMessage}
                  onTaskStartNotificationsChange={onTaskStartNotificationsChange}
                  onTaskEndNotificationsChange={onTaskEndNotificationsChange}
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
