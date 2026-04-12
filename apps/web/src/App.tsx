import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LoginView } from "@/components/auth/login-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppShellData } from "@/hooks/use-app-shell-data";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient();

function AppContent() {
  const session = useSupabaseSession();
  const {
    authQuery,
    date,
    dayPlanQuery,
    loading,
    plannerMutations,
    queryError,
    queryErrorMessage,
    setDate,
    togglSettingsQuery,
  } =
    useAppShellData(session);

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
      isDiscoveringToggl={plannerMutations.isDiscoveringToggl}
      isSavingToggl={plannerMutations.isSavingToggl}
      onDateChange={setDate}
      onDiscoverToggl={plannerMutations.actions.discoverToggl}
      onDeleteToggl={plannerMutations.actions.deleteToggl}
      onSaveToggl={plannerMutations.actions.saveToggl}
      onSignOut={handleSignOut}
      plannerPageProps={{
        isMutating: plannerMutations.isMutating,
        isSyncing: plannerMutations.isSyncing,
        onConfirmDraft: plannerMutations.actions.confirmDraft,
        onCreateScheduleBlock: plannerMutations.actions.createScheduleBlock,
        onCreateTask: plannerMutations.actions.createTask,
        onDeleteScheduleBlock: plannerMutations.actions.deleteScheduleBlock,
        onDeleteTask: plannerMutations.actions.deleteTask,
        onDismissCalendarEvent: plannerMutations.actions.dismissCalendarEvent,
        onRejectDraft: plannerMutations.actions.rejectDraft,
        onStartTimer: plannerMutations.actions.startTimer,
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
      </BrowserRouter>
    </QueryClientProvider>
  );
}
