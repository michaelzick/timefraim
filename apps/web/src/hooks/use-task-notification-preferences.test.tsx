import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTaskNotificationPreferences } from "@/hooks/use-task-notification-preferences";

type Preferences = {
  theme: "light" | "dark" | "system";
  taskStartNotificationsEnabled: boolean;
  taskEndNotificationsEnabled: boolean;
};

const hoisted = vi.hoisted(() => ({
  mutate: vi.fn(),
  preferences: null as Preferences | null,
}));

vi.mock("@/hooks/use-user-preferences", () => ({
  useUserPreferences: () => ({
    preferences: hoisted.preferences,
    query: {},
    mutation: { mutate: hoisted.mutate },
  }),
}));

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
  beforeEach(() => {
    hoisted.mutate.mockClear();
    hoisted.preferences = {
      theme: "system",
      taskStartNotificationsEnabled: false,
      taskEndNotificationsEnabled: false,
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reflects the saved start and end preferences from the database", () => {
    stubNotification({ permission: "granted" });
    hoisted.preferences = {
      theme: "system",
      taskStartNotificationsEnabled: true,
      taskEndNotificationsEnabled: true,
    };

    const { result } = renderHook(() => useTaskNotificationPreferences());

    expect(result.current.startEnabled).toBe(true);
    expect(result.current.endEnabled).toBe(true);
    expect(result.current.message).toBeNull();
  });

  it("requests permission and persists when enabling start pop-ups", async () => {
    const { requestPermission } = stubNotification({
      permission: "default",
      requestPermissionResult: "granted",
    });
    const { result } = renderHook(() => useTaskNotificationPreferences());

    await act(async () => {
      await result.current.setStartEnabledFromUserAction(true);
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(hoisted.mutate).toHaveBeenCalledWith({ taskStartNotificationsEnabled: true });
  });

  it("persists the end preference independently of start", async () => {
    stubNotification({ permission: "granted" });
    const { result } = renderHook(() => useTaskNotificationPreferences());

    await act(async () => {
      await result.current.setEndEnabledFromUserAction(true);
    });

    expect(hoisted.mutate).toHaveBeenCalledWith({ taskEndNotificationsEnabled: true });
  });

  it("keeps the preference off and shows a message when permission is denied", async () => {
    stubNotification({
      permission: "default",
      requestPermissionResult: "denied",
    });
    const { result } = renderHook(() => useTaskNotificationPreferences());

    await act(async () => {
      await result.current.setStartEnabledFromUserAction(true);
    });

    expect(hoisted.mutate).toHaveBeenCalledWith({ taskStartNotificationsEnabled: false });
    await waitFor(() => {
      expect(result.current.message).toMatch(/blocked/i);
    });
  });

  it("disables a preference without requesting permission", async () => {
    const { requestPermission } = stubNotification({ permission: "granted" });
    const { result } = renderHook(() => useTaskNotificationPreferences());

    await act(async () => {
      await result.current.setEndEnabledFromUserAction(false);
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(hoisted.mutate).toHaveBeenCalledWith({ taskEndNotificationsEnabled: false });
  });
});
