import { useState } from "react";
import type { UserPreferencesUpdate } from "@timefraim/shared";
import { useUserPreferences } from "@/hooks/use-user-preferences";

const UNSUPPORTED_MESSAGE = "This browser does not support notification pop-ups.";
const BLOCKED_MESSAGE =
  "Browser pop-ups are blocked. Enable notifications in your browser settings to use this.";
const NOT_ENABLED_MESSAGE = "Browser pop-ups were not enabled.";
const FAILED_MESSAGE = "The browser could not enable notification pop-ups.";

function supportsBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

async function ensurePermission(): Promise<NotificationPermission> {
  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function useTaskNotificationPreferences() {
  const supported = supportsBrowserNotifications();
  const { preferences, mutation } = useUserPreferences();
  const [message, setMessage] = useState<string | null>(() =>
    supported ? null : UNSUPPORTED_MESSAGE,
  );

  const startEnabled = supported ? (preferences?.taskStartNotificationsEnabled ?? false) : false;
  const endEnabled = supported ? (preferences?.taskEndNotificationsEnabled ?? false) : false;

  async function applyPreference(
    buildUpdate: (enabled: boolean) => UserPreferencesUpdate,
    nextEnabled: boolean,
  ) {
    if (!supported) {
      setMessage(UNSUPPORTED_MESSAGE);
      return;
    }

    if (!nextEnabled) {
      mutation.mutate(buildUpdate(false));
      setMessage(null);
      return;
    }

    const permission = await ensurePermission();
    if (permission === "granted") {
      mutation.mutate(buildUpdate(true));
      setMessage(null);
      return;
    }

    mutation.mutate(buildUpdate(false));
    if (permission === "denied") {
      setMessage(BLOCKED_MESSAGE);
    } else if (permission === "default") {
      setMessage(NOT_ENABLED_MESSAGE);
    } else {
      setMessage(FAILED_MESSAGE);
    }
  }

  return {
    startEnabled,
    endEnabled,
    message,
    supported,
    setStartEnabledFromUserAction: (nextEnabled: boolean) =>
      applyPreference((enabled) => ({ taskStartNotificationsEnabled: enabled }), nextEnabled),
    setEndEnabledFromUserAction: (nextEnabled: boolean) =>
      applyPreference((enabled) => ({ taskEndNotificationsEnabled: enabled }), nextEnabled),
  };
}
