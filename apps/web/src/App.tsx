import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { LoginView } from "@/components/auth/login-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { useAppShellData } from "@/hooks/use-app-shell-data";
import { useScheduleBlockEndNotification } from "@/hooks/use-schedule-block-end-notification";
import { useTaskEndNotificationPreference } from "@/hooks/use-task-end-notification-preference";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient();

function AppContent() {
  const session = useSupabaseSession();
  const {
    authQuery,
    date,
    dayPlanQuery,
    googleCalendarSettingsQuery,
    loading,
    plannerMutations,
    queryError,
    queryErrorMessage,
    saveGoogleCalendarsMutation,
    setDate,
    togglSettingsQuery,
  } =
    useAppShellData(session);
  const taskEndNotifications = useTaskEndNotificationPreference();

  const dayPlanTasks = dayPlanQuery.data?.tasks;
  const dayPlanScheduleBlocks = dayPlanQuery.data?.scheduleBlocks;
  const tasksById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof dayPlanTasks>[number]>();
    for (const task of dayPlanTasks ?? []) {
      map.set(task.id, task);
    }
    return map;
  }, [dayPlanTasks]);
  useScheduleBlockEndNotification({
    enabled: taskEndNotifications.enabled,
    scheduleBlocks: dayPlanScheduleBlocks ?? [],
    tasksById,
  });

  const handleRetry = () => {
    const retry = async () => {
      await Promise.all([
        authQuery.refetch(),
        dayPlanQuery.refetch(),
      ]);
    };

    void retry();
  };

  const handleSignOut = () => {
    void supabase.auth.signOut();
  };

  if (!session) {
    return <LoginView />;
  }

  if (loading || !authQuery.data || !dayPlanQuery.data || !togglSettingsQuery.data) {
    if (queryError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-[640px] items-center px-6">
          <Card className="w-full p-8">
            <Badge>Planner load failed</Badge>
            <h1 className="mt-5 text-3xl font-semibold text-white">TimeFraim could not finish loading.</h1>
            <p className="mt-4 text-base leading-7 text-[var(--muted-strong)]">{queryErrorMessage}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={handleRetry}>
                Retry
              </Button>
              <Button variant="secondary" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <AppShell
      authSession={authQuery.data}
      date={date}
      dayPlan={dayPlanQuery.data}
      togglSettings={togglSettingsQuery.data}
      googleCalendarSettings={googleCalendarSettingsQuery.data ?? null}
      isDiscoveringToggl={plannerMutations.isDiscoveringToggl}
      isSavingToggl={plannerMutations.isSavingToggl}
      isLoadingGoogleCalendars={googleCalendarSettingsQuery.isLoading}
      isSavingGoogleCalendars={saveGoogleCalendarsMutation.isPending}
      taskEndNotificationsEnabled={taskEndNotifications.enabled}
      taskEndNotificationsSupported={taskEndNotifications.supported}
      taskEndNotificationsMessage={taskEndNotifications.message}
      onDateChange={setDate}
      onDiscoverToggl={plannerMutations.actions.discoverToggl}
      onDeleteToggl={plannerMutations.actions.deleteToggl}
      onSaveToggl={plannerMutations.actions.saveToggl}
      onSaveGoogleCalendars={(ids) => saveGoogleCalendarsMutation.mutateAsync(ids)}
      onTaskEndNotificationsChange={taskEndNotifications.setEnabledFromUserAction}
      onSignOut={handleSignOut}
      plannerPageProps={{
        isMutating: plannerMutations.isMutating,
        isSyncing: plannerMutations.isSyncing,
        onCreateScheduleBlock: plannerMutations.actions.createScheduleBlock,
        onCreateTask: plannerMutations.actions.createTask,
        onDeleteScheduleBlock: plannerMutations.actions.deleteScheduleBlock,
        onDeleteTask: plannerMutations.actions.deleteTask,
        onDismissCalendarEvent: plannerMutations.actions.dismissCalendarEvent,
        onDuplicateScheduleBlock: plannerMutations.actions.duplicateScheduleBlock,
        onDuplicateTask: plannerMutations.actions.duplicateTask,
        onUpdateCalendarEvent: plannerMutations.actions.updateCalendarEvent,
        onStartTimer: plannerMutations.actions.startTimer,
        onStartEventTimer: plannerMutations.actions.startEventTimer,
        onStopTimer: plannerMutations.actions.stopTimer,
        onSyncCalendar: plannerMutations.actions.syncCalendar,
        onUpdateScheduleBlock: plannerMutations.actions.updateScheduleBlock,
        onUpdateTask: plannerMutations.actions.updateTask,
        togglSettings: togglSettingsQuery.data,
      }}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
        <Toaster
          theme="dark"
          position="bottom-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "border border-white/10 bg-[rgba(8,12,24,0.92)] text-[var(--text)] backdrop-blur-xl shadow-[0_24px_80px_rgba(5,8,18,0.55)]",
              actionButton: "bg-[var(--accent)] text-[var(--surface)]",
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
