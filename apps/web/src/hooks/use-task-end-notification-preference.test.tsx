import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TASK_END_NOTIFICATIONS_STORAGE_KEY,
  useTaskEndNotificationPreference,
} from "@/hooks/use-task-end-notification-preference";

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

describe("useTaskEndNotificationPreference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the saved preference from localStorage", () => {
    stubNotification({ permission: "granted" });
    window.localStorage.setItem(TASK_END_NOTIFICATIONS_STORAGE_KEY, "true");

    const { result } = renderHook(() => useTaskEndNotificationPreference());

    expect(result.current.enabled).toBe(true);
    expect(result.current.message).toBeNull();
  });

  it("requests permission when enabling pop-ups from a user action", async () => {
    const { requestPermission } = stubNotification({
      permission: "default",
      requestPermissionResult: "granted",
    });
    const { result } = renderHook(() => useTaskEndNotificationPreference());

    await act(async () => {
      await result.current.setEnabledFromUserAction(true);
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
    });
    expect(window.localStorage.getItem(TASK_END_NOTIFICATIONS_STORAGE_KEY)).toBe("true");
    expect(result.current.message).toBeNull();
  });

  it("keeps pop-ups disabled and shows a message when permission is denied", async () => {
    stubNotification({
      permission: "default",
      requestPermissionResult: "denied",
    });
    const { result } = renderHook(() => useTaskEndNotificationPreference());

    await act(async () => {
      await result.current.setEnabledFromUserAction(true);
    });

    await waitFor(() => {
      expect(result.current.enabled).toBe(false);
    });
    expect(window.localStorage.getItem(TASK_END_NOTIFICATIONS_STORAGE_KEY)).toBe("false");
    expect(result.current.message).toMatch(/blocked/i);
  });
});
