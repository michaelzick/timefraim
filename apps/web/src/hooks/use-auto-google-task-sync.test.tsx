import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoGoogleTaskSync } from "@/hooks/use-auto-google-task-sync";

const { api } = vi.hoisted(() => ({
  api: {
    syncCalendar: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({ api }));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe("useAutoGoogleTaskSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.syncCalendar.mockResolvedValue({
      date: "2026-04-06",
      events: [],
      calendarSync: { status: "fully_synced", syncedAt: "2026-04-06T09:00:00.000Z", hiddenEventCount: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("syncs on load, focus, and interval while enabled", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(
      () =>
        useAutoGoogleTaskSync({
          date: "2026-04-06",
          enabled: true,
          intervalMs: 10,
          manualSyncPending: false,
          token: "token",
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(api.syncCalendar).toHaveBeenCalledTimes(1));

    void act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(api.syncCalendar).toHaveBeenCalledTimes(2));

    await waitFor(() => expect(api.syncCalendar.mock.calls.length).toBeGreaterThanOrEqual(3));
  });

  it("skips syncs when disabled or hidden", async () => {
    const disabledClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(
      () =>
        useAutoGoogleTaskSync({
          date: "2026-04-06",
          enabled: false,
          intervalMs: 10_000,
          manualSyncPending: false,
          token: "token",
        }),
      { wrapper: createWrapper(disabledClient) },
    );

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(api.syncCalendar).not.toHaveBeenCalled();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const visibilitySpy = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");

    renderHook(
      () =>
        useAutoGoogleTaskSync({
          date: "2026-04-06",
          enabled: true,
          intervalMs: 10,
          manualSyncPending: false,
          token: "token",
        }),
      { wrapper: createWrapper(queryClient) },
    );

    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(api.syncCalendar).not.toHaveBeenCalled();

    visibilitySpy.mockReturnValue("visible");
    void act(() => document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(() => expect(api.syncCalendar).toHaveBeenCalledTimes(1));
  });

  it("does not overlap sync requests", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const deferred = createDeferred<unknown>();
    api.syncCalendar.mockReturnValue(deferred.promise);

    renderHook(
      () =>
        useAutoGoogleTaskSync({
          date: "2026-04-06",
          enabled: true,
          intervalMs: 10_000,
          manualSyncPending: false,
          token: "token",
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(api.syncCalendar).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(api.syncCalendar).toHaveBeenCalledTimes(1);

    await act(async () => deferred.resolve({}));
    void act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(api.syncCalendar).toHaveBeenCalledTimes(2));
  });
});
