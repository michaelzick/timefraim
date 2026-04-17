import type { Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { getTodayDate, getTimezoneOffsetForDate } from "@/lib/utils";
import { useGoogleSessionSync } from "@/hooks/use-google-session-sync";
import { usePlannerMutations } from "@/hooks/use-planner-mutations";

export function useAppShellData(session: Session | null) {
  const [date, setDate] = useState(getTodayDate());
  const token = session?.access_token ?? "";
  const queryClient = useQueryClient();

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

  useGoogleSessionSync({ session, token, onSynced: invalidatePlannerData });

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
  const togglSettingsQuery = useQuery({
    queryKey: ["toggl-settings", token],
    enabled: Boolean(token),
    queryFn: () => api.getTogglSettings(token),
    retry: false,
  });

  const googleCalendarSettingsQuery = useQuery({
    queryKey: ["google-calendar-settings", token],
    enabled: Boolean(token),
    queryFn: () => api.getGoogleCalendarSettings(token),
    retry: false,
  });

  const saveGoogleCalendarsMutation = useMutation({
    mutationFn: (syncCalendarIds: string[]) =>
      api.saveGoogleCalendarSettings(token, { syncCalendarIds }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["google-calendar-settings", token] });
    },
  });

  const plannerMutations = usePlannerMutations({
    date,
    token,
    onSuccess: invalidatePlannerData,
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
