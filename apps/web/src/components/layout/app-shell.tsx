import type {
  AuthSession,
  DayPlan,
  GoogleCalendarSettings,
  OpenAiGeneratedImage,
  OpenAiImageSettings,
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
  openAiImageSettings: OpenAiImageSettings | null;
  isDiscoveringToggl: boolean;
  isSavingToggl: boolean;
  isLoadingGoogleCalendars: boolean;
  isLoadingOpenAiImageSettings: boolean;
  isSavingGoogleCalendars: boolean;
  isSavingOpenAiImage: boolean;
  isGeneratingOpenAiImage: boolean;
  taskEndNotificationsEnabled: boolean;
  taskEndNotificationsSupported: boolean;
  taskEndNotificationsMessage: string | null;
  onDateChange: (nextDate: string) => void;
  onDiscoverToggl: (values: TogglDiscoverInput) => Promise<TogglDiscoverResult>;
  onDeleteToggl: () => Promise<TogglIntegrationSettings>;
  onDeleteOpenAiConnection: () => Promise<OpenAiImageSettings>;
  onGenerateOpenAiImage: (prompt: string) => Promise<OpenAiGeneratedImage>;
  onSaveToggl: (values: TogglConnect) => Promise<TogglIntegrationSettings>;
  onSaveGoogleCalendars: (syncCalendarIds: string[]) => Promise<unknown>;
  onSaveOpenAiConnection: (apiKey: string) => Promise<OpenAiImageSettings>;
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
  openAiImageSettings,
  isDiscoveringToggl,
  isSavingToggl,
  isLoadingGoogleCalendars,
  isLoadingOpenAiImageSettings,
  isSavingGoogleCalendars,
  isSavingOpenAiImage,
  isGeneratingOpenAiImage,
  taskEndNotificationsEnabled,
  taskEndNotificationsSupported,
  taskEndNotificationsMessage,
  onDateChange,
  onDiscoverToggl,
  onDeleteToggl,
  onDeleteOpenAiConnection,
  onGenerateOpenAiImage,
  onSaveToggl,
  onSaveGoogleCalendars,
  onSaveOpenAiConnection,
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
                  openAiImageSettings={openAiImageSettings}
                  isLoadingGoogleCalendars={isLoadingGoogleCalendars}
                  isLoadingOpenAiImageSettings={isLoadingOpenAiImageSettings}
                  isSavingGoogleCalendars={isSavingGoogleCalendars}
                  isSavingOpenAiImage={isSavingOpenAiImage}
                  isGeneratingOpenAiImage={isGeneratingOpenAiImage}
                  isDiscovering={isDiscoveringToggl}
                  onSaveToggl={onSaveToggl}
                  onDiscoverToggl={onDiscoverToggl}
                  onDeleteToggl={onDeleteToggl}
                  onDeleteOpenAiConnection={onDeleteOpenAiConnection}
                  onGenerateOpenAiImage={onGenerateOpenAiImage}
                  onSaveGoogleCalendars={onSaveGoogleCalendars}
                  onSaveOpenAiConnection={onSaveOpenAiConnection}
                  taskEndNotificationsEnabled={taskEndNotificationsEnabled}
                  taskEndNotificationsSupported={taskEndNotificationsSupported}
                  taskEndNotificationsMessage={taskEndNotificationsMessage}
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
