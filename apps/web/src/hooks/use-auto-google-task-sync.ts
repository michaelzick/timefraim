import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef } from "react";
import { api } from "@/lib/api";
import { getTimezoneOffsetForDate } from "@/lib/utils";

const DEFAULT_GOOGLE_TASK_SYNC_INTERVAL_MS = 30_000;

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

export function useAutoGoogleTaskSync({
  date,
  enabled,
  intervalMs = DEFAULT_GOOGLE_TASK_SYNC_INTERVAL_MS,
  manualSyncPending,
  token,
}: {
  date: string;
  enabled: boolean;
  intervalMs?: number;
  manualSyncPending: boolean;
  token: string;
}) {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);

  const syncNow = useEffectEvent(async () => {
    if (!enabled || !token || manualSyncPending || inFlightRef.current || !isDocumentVisible()) {
      return;
    }

    inFlightRef.current = true;
    try {
      await api.syncCalendar(token, date, getTimezoneOffsetForDate(date));
      await queryClient.invalidateQueries({ queryKey: ["day-plan", token, date] });
    } catch (error) {
      console.error(error);
    } finally {
      inFlightRef.current = false;
    }
  });

  useEffect(() => {
    void syncNow();
  }, [date, enabled, syncNow, token]);

  useEffect(() => {
    if (!enabled || !token) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void syncNow();
    }, intervalMs);
    const handleActive = () => {
      void syncNow();
    };

    window.addEventListener("focus", handleActive);
    document.addEventListener("visibilitychange", handleActive);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleActive);
      document.removeEventListener("visibilitychange", handleActive);
    };
  }, [enabled, intervalMs, syncNow, token]);
}
