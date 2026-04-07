import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useEffectEvent, useMemo, useRef, useState, startTransition } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { CalendarDays, LoaderCircle, Settings2 } from "lucide-react";
import { PlannerPage } from "@/pages/planner-page";
import { SettingsPage } from "@/pages/settings-page";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTodayDate, getTimezoneOffsetForDate } from "@/lib/utils";

const queryClient = new QueryClient();

function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        startTransition(() => setSession(data.session));
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      startTransition(() => setSession(nextSession));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return session;
}

function LoginView() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-[560px] items-center px-6">
      <Card className="w-full p-8">
        <Badge>Single-user planner</Badge>
        <h1 className="mt-5 text-4xl font-semibold text-white">Sculpt your day before it gets stolen.</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted-strong)]">
          TimeFraim reads your primary Google Calendar, creates app-managed focus blocks, syncs Toggl timers,
          and exposes a guarded MCP endpoint for Claude and ChatGPT.
        </p>
        <Button
          className="mt-8 w-full"
          size="lg"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: window.location.origin,
                scopes:
                  "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
              },
            });
          }}
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </Button>
      </Card>
    </div>
  );
}

function AppShell() {
  const session = useSupabaseSession();
  const token = session?.access_token ?? "";
  const [date, setDate] = useState(getTodayDate());
  const queryClient = useQueryClient();
  const syncedProviderToken = useRef<string | null>(null);

  const ensureAllowedEmail = useEffectEvent(async () => {
    const email = session?.user.email?.toLowerCase();
    const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL.toLowerCase();
    if (email && email !== allowedEmail) {
      await supabase.auth.signOut();
      alert(`This app only allows ${allowedEmail}.`);
    }
  });

  useEffect(() => {
    void ensureAllowedEmail();
  }, [ensureAllowedEmail, session?.user.email]);

  const authQuery = useQuery({
    queryKey: ["auth-session", token],
    enabled: Boolean(token),
    queryFn: () => api.getAuthSession(token),
    retry: false,
  });

  const dayPlanQuery = useQuery({
    queryKey: ["day-plan", token, date],
    enabled: Boolean(token),
    queryFn: () => api.getDayPlan(token, date, getTimezoneOffsetForDate(date)),
    retry: false,
  });

  const invalidatePlannerData = useEffectEvent(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["auth-session", token] }),
      queryClient.invalidateQueries({ queryKey: ["day-plan", token] }),
    ]);
  });

  useEffect(() => {
    const providerToken = (session as Session & { provider_token?: string; provider_refresh_token?: string })?.provider_token;
    if (!providerToken || providerToken === syncedProviderToken.current || !token) {
      return;
    }

    const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
    syncedProviderToken.current = providerToken;
    void api
      .saveGoogleSession(token, {
        accessToken: providerToken,
        refreshToken:
          (session as Session & { provider_refresh_token?: string }).provider_refresh_token ?? null,
        expiresAt,
        email: session?.user.email,
        calendarId: "primary",
      })
      .then(() => invalidatePlannerData())
      .catch((error) => {
        console.error(error);
        syncedProviderToken.current = null;
      });
  }, [invalidatePlannerData, session, token]);

  const createTaskMutation = useMutation({
    mutationFn: (values: { title: string; notes?: string; estimatedMinutes: number; status: string }) =>
      api.createTask(token, values),
    onSuccess: invalidatePlannerData,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: Record<string, unknown> }) =>
      api.updateTask(token, taskId, values),
    onSuccess: invalidatePlannerData,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.deleteTask(token, taskId),
    onSuccess: invalidatePlannerData,
  });

  const createScheduleBlockMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.createScheduleBlock(token, values),
    onSuccess: invalidatePlannerData,
  });

  const deleteScheduleBlockMutation = useMutation({
    mutationFn: (scheduleBlockId: string) => api.deleteScheduleBlock(token, scheduleBlockId),
    onSuccess: invalidatePlannerData,
  });

  const dismissCalendarEventMutation = useMutation({
    mutationFn: (calendarEventId: string) => api.dismissCalendarEvent(token, calendarEventId),
    onSuccess: invalidatePlannerData,
  });

  const confirmDraftMutation = useMutation({
    mutationFn: (draftId: string) => api.confirmDraft(token, draftId),
    onSuccess: invalidatePlannerData,
  });

  const rejectDraftMutation = useMutation({
    mutationFn: (draftId: string) => api.rejectDraft(token, draftId),
    onSuccess: invalidatePlannerData,
  });

  const startTimerMutation = useMutation({
    mutationFn: (taskId: string) => api.startTimer(token, { taskId, source: "manual" }),
    onSuccess: invalidatePlannerData,
  });

  const stopTimerMutation = useMutation({
    mutationFn: () => api.stopTimer(token),
    onSuccess: invalidatePlannerData,
  });

  const syncCalendarMutation = useMutation({
    mutationFn: () => api.syncCalendar(token, date, getTimezoneOffsetForDate(date)),
    onSuccess: invalidatePlannerData,
  });

  const saveTogglMutation = useMutation({
    mutationFn: (values: { apiToken: string; workspaceId: string; defaultProjectId: string }) =>
      api.saveTogglConnection(token, values),
    onSuccess: invalidatePlannerData,
  });

  const isMutating =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    createScheduleBlockMutation.isPending ||
    deleteScheduleBlockMutation.isPending ||
    dismissCalendarEventMutation.isPending ||
    confirmDraftMutation.isPending ||
    rejectDraftMutation.isPending ||
    startTimerMutation.isPending ||
    stopTimerMutation.isPending;

  const loading = useMemo(
    () => authQuery.isLoading || dayPlanQuery.isLoading,
    [authQuery.isLoading, dayPlanQuery.isLoading],
  );
  const queryError = authQuery.error ?? dayPlanQuery.error;
  const queryErrorMessage = queryError instanceof Error ? queryError.message : "Unable to load planner data.";

  if (!session) {
    return <LoginView />;
  }

  if (loading || !authQuery.data || !dayPlanQuery.data) {
    if (queryError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-[640px] items-center px-6">
          <Card className="w-full p-8">
            <Badge>Planner load failed</Badge>
            <h1 className="mt-5 text-3xl font-semibold text-white">TimeFraim could not finish loading.</h1>
            <p className="mt-4 text-base leading-7 text-[var(--muted-strong)]">{queryErrorMessage}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  void authQuery.refetch();
                  void dayPlanQuery.refetch();
                }}
              >
                Retry
              </Button>
              <Button variant="secondary" onClick={() => void supabase.auth.signOut()}>
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
    <div className="min-h-screen px-5 py-6 md:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 rounded-[32px] border border-white/10 bg-[rgba(8,12,24,0.82)] p-6 shadow-[0_24px_80px_rgba(5,8,18,0.55)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge>Allowlisted for {authQuery.data.user.email}</Badge>
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
            <Button variant="secondary" onClick={() => void supabase.auth.signOut()}>
              Sign out
            </Button>
          </div>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              <PlannerPage
                date={date}
                dayPlan={dayPlanQuery.data}
                onDateChange={setDate}
                onCreateTask={(values) => createTaskMutation.mutateAsync(values)}
                onUpdateTask={(taskId, values) => updateTaskMutation.mutateAsync({ taskId, values })}
                onDeleteTask={(taskId) => deleteTaskMutation.mutateAsync(taskId)}
                onCreateScheduleBlock={(values) => createScheduleBlockMutation.mutateAsync(values)}
                onDeleteScheduleBlock={(scheduleBlockId) => deleteScheduleBlockMutation.mutateAsync(scheduleBlockId)}
                onDismissCalendarEvent={(calendarEventId) => dismissCalendarEventMutation.mutateAsync(calendarEventId)}
                onConfirmDraft={(draftId) => confirmDraftMutation.mutateAsync(draftId)}
                onRejectDraft={(draftId) => rejectDraftMutation.mutateAsync(draftId)}
                onStartTimer={(taskId) => startTimerMutation.mutateAsync(taskId)}
                onStopTimer={() => stopTimerMutation.mutateAsync()}
                onSyncCalendar={() => syncCalendarMutation.mutateAsync()}
                isSyncing={syncCalendarMutation.isPending}
                isMutating={isMutating}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                authSession={authQuery.data}
                onSaveToggl={(values) => saveTogglMutation.mutateAsync(values)}
                isSaving={saveTogglMutation.isPending}
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
