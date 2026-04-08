import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { api } from "@/lib/api";
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
    ]);
  });

  const ensureAllowedEmail = useEffectEvent(async () => {
    const email = session?.user.email?.toLowerCase();
    const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL.toLowerCase();
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

  const plannerMutations = usePlannerMutations({
    date,
    token,
    onSuccess: invalidatePlannerData,
  });

  const loading = useMemo(
    () => authQuery.isLoading || dayPlanQuery.isLoading,
    [authQuery.isLoading, dayPlanQuery.isLoading],
  );
  const queryError = authQuery.error ?? dayPlanQuery.error;
  const queryErrorMessage = queryError instanceof Error ? queryError.message : "Unable to load planner data.";

  return {
    authQuery,
    date,
    dayPlanQuery,
    loading,
    plannerMutations,
    queryError,
    queryErrorMessage,
    setDate,
  };
}
