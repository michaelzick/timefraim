import type { ScheduleBlock, Task } from "@timefraim/shared";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleBlockEndNotification } from "@/hooks/use-schedule-block-end-notification";
import { buildTask } from "@/test/fixtures";

function Harness(args: {
  enabled: boolean;
  scheduleBlocks: ScheduleBlock[];
  tasksById: Map<string, Task>;
}) {
  useScheduleBlockEndNotification(args);
  return null;
}

function stubNotification(permission: NotificationPermission) {
  const ctor = vi.fn();
  const requestPermission = vi.fn().mockResolvedValue(permission);
  class FakeNotification {
    static permission: NotificationPermission = permission;
    static requestPermission = requestPermission;
    constructor(title: string, options?: NotificationOptions) {
      ctor(title, options);
    }
  }
  vi.stubGlobal("Notification", FakeNotification);
  return { ctor, requestPermission };
}

describe("useScheduleBlockEndNotification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fires a notification once per block when its end time passes", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Deep focus" });
    const block: ScheduleBlock = {
      id: "block-1",
      taskId: task.id,
      startAt: "2026-04-20T08:30:00.000Z",
      endAt: "2026-04-20T09:00:30.000Z",
      source: "manual",
      state: "confirmed",
      googleEventId: null,
      createdAt: "2026-04-20T08:00:00.000Z",
      updatedAt: "2026-04-20T08:00:00.000Z",
    };
    const tasksById = new Map([[task.id, task]]);

    render(<Harness enabled scheduleBlocks={[block]} tasksById={tasksById} />);

    await act(async () => {
      vi.setSystemTime(new Date("2026-04-20T09:01:00.000Z"));
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith("Task ended", expect.objectContaining({ body: "Deep focus", tag: "block-1" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).toHaveBeenCalledTimes(1);
  });

  it("skips blocks that ended before notifications were enabled", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Stale focus" });
    const block: ScheduleBlock = {
      id: "block-stale",
      taskId: task.id,
      startAt: "2026-04-20T07:00:00.000Z",
      endAt: "2026-04-20T08:30:00.000Z",
      source: "manual",
      state: "confirmed",
      googleEventId: null,
      createdAt: "2026-04-20T08:00:00.000Z",
      updatedAt: "2026-04-20T08:00:00.000Z",
    };

    render(<Harness enabled scheduleBlocks={[block]} tasksById={new Map([[task.id, task]])} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).not.toHaveBeenCalled();
  });

  it("fires a delayed notification after the browser regains focus", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Delayed focus" });
    const block: ScheduleBlock = {
      id: "block-delayed",
      taskId: task.id,
      startAt: "2026-04-20T09:00:00.000Z",
      endAt: "2026-04-20T09:10:00.000Z",
      source: "manual",
      state: "confirmed",
      googleEventId: null,
      createdAt: "2026-04-20T08:00:00.000Z",
      updatedAt: "2026-04-20T08:00:00.000Z",
    };

    render(<Harness enabled scheduleBlocks={[block]} tasksById={new Map([[task.id, task]])} />);

    await act(async () => {
      vi.setSystemTime(new Date("2026-04-20T10:30:00.000Z"));
      window.dispatchEvent(new Event("focus"));
    });

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith("Task ended", expect.objectContaining({ body: "Delayed focus" }));
  });

  it("does not request permission automatically on mount", () => {
    const { requestPermission } = stubNotification("default");

    render(<Harness enabled scheduleBlocks={[]} tasksById={new Map()} />);

    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("does not fire notifications while the setting is disabled", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Quiet block" });
    const block: ScheduleBlock = {
      id: "block-disabled",
      taskId: task.id,
      startAt: "2026-04-20T08:30:00.000Z",
      endAt: "2026-04-20T09:00:30.000Z",
      source: "manual",
      state: "confirmed",
      googleEventId: null,
      createdAt: "2026-04-20T08:00:00.000Z",
      updatedAt: "2026-04-20T08:00:00.000Z",
    };

    render(<Harness enabled={false} scheduleBlocks={[block]} tasksById={new Map([[task.id, task]])} />);

    await act(async () => {
      vi.setSystemTime(new Date("2026-04-20T09:01:00.000Z"));
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).not.toHaveBeenCalled();
  });
});
