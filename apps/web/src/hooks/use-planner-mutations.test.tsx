import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { DayPlan } from "@timefraim/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlannerMutations } from "@/hooks/use-planner-mutations";
import { buildDayPlan } from "@/test/fixtures";

const { api } = vi.hoisted(() => ({
  api: {
    confirmDraft: vi.fn(),
    createScheduleBlock: vi.fn(),
    createTask: vi.fn(),
    deleteScheduleBlock: vi.fn(),
    deleteTask: vi.fn(),
    dismissCalendarEvent: vi.fn(),
    rejectDraft: vi.fn(),
    saveTogglConnection: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    syncCalendar: vi.fn(),
    updateScheduleBlock: vi.fn(),
    updateTask: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({ api }));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createDeferred<T>() {
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((_promiseResolve, promiseReject) => {
    reject = promiseReject;
  });
  return { promise, reject };
}

describe("usePlannerMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createTask.mockResolvedValue({ status: "applied", kind: "task.create", diffSummary: "" });
    api.updateTask.mockResolvedValue({ status: "applied", kind: "task.update", diffSummary: "" });
    api.deleteTask.mockResolvedValue({ status: "applied", kind: "task.delete", diffSummary: "" });
    api.createScheduleBlock.mockResolvedValue({ status: "applied", kind: "schedule_block.create", diffSummary: "" });
    api.updateScheduleBlock.mockResolvedValue({ status: "applied", kind: "schedule_block.update", diffSummary: "" });
    api.deleteScheduleBlock.mockResolvedValue({ status: "applied", kind: "schedule_block.delete", diffSummary: "" });
    api.dismissCalendarEvent.mockResolvedValue({ status: "applied", kind: "calendar_event.dismiss", diffSummary: "" });
    api.confirmDraft.mockResolvedValue({ id: "draft-1" });
    api.rejectDraft.mockResolvedValue({ id: "draft-1" });
    api.saveTogglConnection.mockResolvedValue({});
    api.startTimer.mockResolvedValue({ status: "applied", kind: "timer.start", diffSummary: "" });
    api.stopTimer.mockResolvedValue({ status: "applied", kind: "timer.stop", diffSummary: "" });
    api.syncCalendar.mockResolvedValue({ date: "2026-04-06", events: [] });
  });

  it("removes a hidden calendar blocker immediately and restores it if the request fails", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const key = ["day-plan", "token", "2026-04-06"] as const;
    const deferred = createDeferred<{ status: "applied"; kind: "calendar_event.dismiss"; diffSummary: string }>();

    queryClient.setQueryData<DayPlan>(
      key,
      buildDayPlan({
        calendarEvents: [
          {
            id: "calendar-1",
            externalEventId: "google-1",
            title: "Team sync",
            startAt: "2026-04-06T15:00:00.000Z",
            endAt: "2026-04-06T15:30:00.000Z",
            isAppManaged: false,
          },
        ],
      }),
    );
    api.dismissCalendarEvent.mockImplementation(() => deferred.promise);

    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(
      () => usePlannerMutations({ date: "2026-04-06", token: "token", onSuccess }),
      { wrapper: createWrapper(queryClient) },
    );

    let dismissPromise: Promise<unknown>;
    act(() => {
      dismissPromise = result.current.actions.dismissCalendarEvent("calendar-1");
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<DayPlan>(key)?.calendarEvents).toHaveLength(0);
    });

    deferred.reject(new Error("Dismiss failed"));
    await expect(dismissPromise!).rejects.toThrow("Dismiss failed");

    await waitFor(() => {
      expect(queryClient.getQueryData<DayPlan>(key)?.calendarEvents).toHaveLength(1);
    });
  });

  it("restores synced calendar blockers into the current day-plan cache", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const key = ["day-plan", "token", "2026-04-06"] as const;
    const restoredEvent = {
      id: "calendar-1",
      externalEventId: "google-1",
      title: "Team sync",
      startAt: "2026-04-06T15:00:00.000Z",
      endAt: "2026-04-06T15:30:00.000Z",
      isAppManaged: false,
    };

    queryClient.setQueryData<DayPlan>(key, buildDayPlan({ calendarEvents: [] }));
    api.syncCalendar.mockResolvedValue({ date: "2026-04-06", events: [restoredEvent] });

    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(
      () => usePlannerMutations({ date: "2026-04-06", token: "token", onSuccess }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await result.current.actions.syncCalendar();
    });

    expect(queryClient.getQueryData<DayPlan>(key)?.calendarEvents).toEqual([restoredEvent]);
    expect(onSuccess).toHaveBeenCalled();
  });
});
