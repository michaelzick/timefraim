import { useState } from "react";

export const TASK_END_NOTIFICATIONS_STORAGE_KEY = "timefraim.task-end-notifications-enabled";

function supportsBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readStoredPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(TASK_END_NOTIFICATIONS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredPreference(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(TASK_END_NOTIFICATIONS_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
}

export function useTaskEndNotificationPreference() {
  const supported = supportsBrowserNotifications();
  const [enabled, setEnabled] = useState(() => (supported ? readStoredPreference() : false));
  const [message, setMessage] = useState<string | null>(() =>
    supported ? null : "This browser does not support notification pop-ups.",
  );

  async function setEnabledFromUserAction(nextEnabled: boolean) {
    if (!supported) {
      setEnabled(false);
      setMessage("This browser does not support notification pop-ups.");
      return;
    }

    if (!nextEnabled) {
      writeStoredPreference(false);
      setEnabled(false);
      setMessage(null);
      return;
    }

    if (Notification.permission === "granted") {
      writeStoredPreference(true);
      setEnabled(true);
      setMessage(null);
      return;
    }

    if (Notification.permission === "denied") {
      writeStoredPreference(false);
      setEnabled(false);
      setMessage("Browser pop-ups are blocked. Enable notifications in your browser settings to use this.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        writeStoredPreference(true);
        setEnabled(true);
        setMessage(null);
        return;
      }

      writeStoredPreference(false);
      setEnabled(false);
      setMessage(
        permission === "denied"
          ? "Browser pop-ups are blocked. Enable notifications in your browser settings to use this."
          : "Browser pop-ups were not enabled.",
      );
    } catch {
      writeStoredPreference(false);
      setEnabled(false);
      setMessage("The browser could not enable notification pop-ups.");
    }
  }

  return {
    enabled,
    message,
    supported,
    setEnabledFromUserAction,
  };
}
