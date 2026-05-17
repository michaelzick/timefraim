import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TASK_END_NOTIFICATIONS_STORAGE_KEY,
  TASK_START_NOTIFICATIONS_STORAGE_KEY,
  useTaskNotificationPreferences,
} from "@/hooks/use-task-notification-preferences";

function stubNotification(args: {
  permission: NotificationPermission;
  requestPermissionResult?: NotificationPermission;
}) {
  const requestPermission = vi.fn().mockResolvedValue(args.requestPermissionResult ?? args.permission);
  class FakeNotification {
    static permission: NotificationPermission = args.permission;
    static requestPermission = requestPermission;
  }
  vi.stubGlobal("Notification", FakeNotification);
  return { requestPermission };
}

describe("useTaskNotificationPreferences", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("loads the saved start and end preferences from localStorage", () => {
    stubNotification({ permission: "granted" });
    window.localStorage.setItem(TASK_START_NOTIFICATIONS_STORAGE_KEY, "true");
    window.localStorage.setItem(TASK_END_NOTIFICATIONS_STORAGE_KEY, "true");

    const { result } = renderHook(() => useTaskNotificationPreferences());

    expect(result.current.startEnabled).toBe(true);
    expect(result.current.endEnabled).toBe(true);
    expect(result.current.message).toBeNull();
  });

  it("requests permission when enabling start pop-ups without touching the end preference", async () => {
    const { requestPermission } = stubNotification({
      permission: "default",
      requestPermissionResult: "granted",
    });
    const { result } = renderHook(() => useTaskNotificationPreferences());

    await act(async () => {
      await result.current.setStartEnabledFromUserAction(true);
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.startEnabled).toBe(true);
    });
    expect(result.current.endEnabled).toBe(false);
    expect(window.localStorage.getItem(TASK_START_NOTIFICATIONS_STORAGE_KEY)).toBe("true");
    expect(window.localStorage.getItem(TASK_END_NOTIFICATIONS_STORAGE_KEY)).toBeNull();
    expect(result.current.message).toBeNull();
  });

  it("enables end pop-ups independently of start pop-ups", async () => {
    stubNotification({ permission: "granted" });
    const { result } = renderHook(() => useTaskNotificationPreferences());

    await act(async () => {
      await result.current.setEndEnabledFromUserAction(true);
    });

    await waitFor(() => {
      expect(result.current.endEnabled).toBe(true);
    });
    expect(result.current.startEnabled).toBe(false);
    expect(window.localStorage.getItem(TASK_END_NOTIFICATIONS_STORAGE_KEY)).toBe("true");
  });

  it("keeps pop-ups disabled and shows a message when permission is denied", async () => {
    stubNotification({
      permission: "default",
      requestPermissionResult: "denied",
    });
    const { result } = renderHook(() => useTaskNotificationPreferences());

    await act(async () => {
      await result.current.setStartEnabledFromUserAction(true);
    });

    await waitFor(() => {
      expect(result.current.startEnabled).toBe(false);
    });
    expect(window.localStorage.getItem(TASK_START_NOTIFICATIONS_STORAGE_KEY)).toBe("false");
    expect(result.current.message).toMatch(/blocked/i);
  });

  it("disables a preference without requesting permission", async () => {
    const { requestPermission } = stubNotification({ permission: "granted" });
    window.localStorage.setItem(TASK_END_NOTIFICATIONS_STORAGE_KEY, "true");
    const { result } = renderHook(() => useTaskNotificationPreferences());

    await act(async () => {
      await result.current.setEndEnabledFromUserAction(false);
    });

    await waitFor(() => {
      expect(result.current.endEnabled).toBe(false);
    });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(TASK_END_NOTIFICATIONS_STORAGE_KEY)).toBe("false");
  });
});
