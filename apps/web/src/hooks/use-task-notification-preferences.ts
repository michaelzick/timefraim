import { useState } from "react";

export const TASK_START_NOTIFICATIONS_STORAGE_KEY = "timefraim.task-start-notifications-enabled";
export const TASK_END_NOTIFICATIONS_STORAGE_KEY = "timefraim.task-end-notifications-enabled";

const UNSUPPORTED_MESSAGE = "This browser does not support notification pop-ups.";
const BLOCKED_MESSAGE =
  "Browser pop-ups are blocked. Enable notifications in your browser settings to use this.";
const NOT_ENABLED_MESSAGE = "Browser pop-ups were not enabled.";
const FAILED_MESSAGE = "The browser could not enable notification pop-ups.";

function supportsBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readStoredPreference(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeStoredPreference(key: string, enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, enabled ? "true" : "false");
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
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
  const [startEnabled, setStartEnabled] = useState(() =>
    supported ? readStoredPreference(TASK_START_NOTIFICATIONS_STORAGE_KEY) : false,
  );
  const [endEnabled, setEndEnabled] = useState(() =>
    supported ? readStoredPreference(TASK_END_NOTIFICATIONS_STORAGE_KEY) : false,
  );
  const [message, setMessage] = useState<string | null>(() =>
    supported ? null : UNSUPPORTED_MESSAGE,
  );

  async function applyPreference(
    key: string,
    setLocal: (value: boolean) => void,
    nextEnabled: boolean,
  ) {
    if (!supported) {
      setLocal(false);
      setMessage(UNSUPPORTED_MESSAGE);
      return;
    }

    if (!nextEnabled) {
      writeStoredPreference(key, false);
      setLocal(false);
      setMessage(null);
      return;
    }

    const permission = await ensurePermission();
    if (permission === "granted") {
      writeStoredPreference(key, true);
      setLocal(true);
      setMessage(null);
      return;
    }

    writeStoredPreference(key, false);
    setLocal(false);
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
      applyPreference(TASK_START_NOTIFICATIONS_STORAGE_KEY, setStartEnabled, nextEnabled),
    setEndEnabledFromUserAction: (nextEnabled: boolean) =>
      applyPreference(TASK_END_NOTIFICATIONS_STORAGE_KEY, setEndEnabled, nextEnabled),
  };
}
