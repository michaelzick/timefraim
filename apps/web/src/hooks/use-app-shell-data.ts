import type { Session } from "@supabase/supabase-js";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  AuthSession,
  DayPlan,
  GoogleCalendarSettings,
  GoogleCalendarSettingsUpdate,
  TogglIntegrationSettings,
} from "@timefraim/shared";
import { useEffect, useEffectEvent, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { env } from "@/lib/env";
import { useAutoGoogleTaskSync } from "@/hooks/use-auto-google-task-sync";
import { useGoogleSessionSync } from "@/hooks/use-google-session-sync";
import { usePlannerMutations } from "@/hooks/use-planner-mutations";
import { supabase } from "@/lib/supabase";
import { getTodayDate, getTimezoneOffsetForDate } from "@/lib/utils";

type AppQueryResult<TData> = UseQueryResult<TData, Error>;
type AppMutationResult<TData, TVariables = void> = UseMutationResult<TData, Error, TVariables, unknown>;

type UseAppShellDataResult = {
  authQuery: AppQueryResult<AuthSession>;
  date: string;
  dayPlanQuery: AppQueryResult<DayPlan>;
  googleCalendarSettingsQuery: AppQueryResult<GoogleCalendarSettings>;
  loading: boolean;
  plannerMutations: ReturnType<typeof usePlannerMutations>;
  queryError: Error | null;
  queryErrorMessage: string;
  saveGoogleCalendarsMutation: AppMutationResult<GoogleCalendarSettings, GoogleCalendarSettingsUpdate>;
  setDate: Dispatch<SetStateAction<string>>;
  togglSettingsQuery: AppQueryResult<TogglIntegrationSettings>;
};

export function useAppShellData(session: Session | null): UseAppShellDataResult {
  const [date, setDate] = useState(getTodayDate());
  const token = session?.access_token ?? "";
  const queryClient = useQueryClient();
  const location = useLocation();
  const routeDate = readDateParam(location.search);

  const invalidatePlannerData = useEffectEvent(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["auth-session", token] }),
      queryClient.invalidateQueries({ queryKey: ["day-plan", token] }),
      queryClient.invalidateQueries({ queryKey: ["toggl-settings", token] }),
    ]);
  });

  const ensureAllowedEmail = useEffectEvent(async () => {
    const email = session?.user.email?.toLowerCase();
    const allowedEmail = env.allowedEmail;
    if (email && email !== allowedEmail) {
      await supabase.auth.signOut();
      window.alert(`This app only allows ${allowedEmail}.`);
    }
  });

  useEffect(() => {
    void ensureAllowedEmail();
  }, [ensureAllowedEmail, session?.user.email]);

  useEffect(() => {
    if (routeDate && routeDate !== date) {
      setDate(routeDate);
    }
  }, [date, routeDate]);

  useGoogleSessionSync({ session, token, onSynced: invalidatePlannerData });

  const authQuery = useQuery({
    queryKey: ["auth-session", token],
    enabled: Boolean(token),
    queryFn: ({ signal }) => api.getAuthSession(token, signal),
    retry: false,
  });
  const dayPlanQuery = useQuery({
    queryKey: ["day-plan", token, date],
    enabled: Boolean(token),
    queryFn: ({ signal }) =>
      api.getDayPlan(token, date, getTimezoneOffsetForDate(date), signal),
    retry: false,
  });
  const togglSettingsQuery = useQuery({
    queryKey: ["toggl-settings", token],
    enabled: Boolean(token),
    queryFn: ({ signal }) => api.getTogglSettings(token, signal),
    retry: false,
  });

  const googleCalendarSettingsQuery = useQuery({
    queryKey: ["google-calendar-settings", token],
    enabled: Boolean(token),
    queryFn: ({ signal }) => api.getGoogleCalendarSettings(token, signal),
    retry: false,
  });

  const saveGoogleCalendarsMutation = useMutation({
    mutationFn: (values: GoogleCalendarSettingsUpdate) =>
      api.saveGoogleCalendarSettings(token, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["google-calendar-settings", token] });
    },
  });

  const plannerMutations = usePlannerMutations({
    date,
    token,
    onSuccess: invalidatePlannerData,
  });
  useAutoGoogleTaskSync({
    date,
    enabled: location.pathname === "/" && Boolean(dayPlanQuery.data?.integrationStatus.googleConnected),
    manualSyncPending: plannerMutations.isSyncing,
    token,
  });

  const loading = useMemo(
    () => authQuery.isLoading || dayPlanQuery.isLoading || togglSettingsQuery.isLoading,
    [authQuery.isLoading, dayPlanQuery.isLoading, togglSettingsQuery.isLoading],
  );
  const queryError = authQuery.error ?? dayPlanQuery.error ?? togglSettingsQuery.error;
  const queryErrorMessage = queryError instanceof Error ? queryError.message : "Unable to load planner data.";

  return {
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
  };
}

function readDateParam(search: string) {
  const value = new URLSearchParams(search).get("date");
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
