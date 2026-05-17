import type { ScheduleBlock, Task } from "@timefraim/shared";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleBlockNotifications } from "@/hooks/use-schedule-block-notifications";
import { buildTask } from "@/test/fixtures";

function Harness(args: {
  startEnabled: boolean;
  endEnabled: boolean;
  scheduleBlocks: ScheduleBlock[];
  tasksById: Map<string, Task>;
}) {
  useScheduleBlockNotifications(args);
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

function buildBlock(overrides: Partial<ScheduleBlock> & Pick<ScheduleBlock, "id" | "taskId">): ScheduleBlock {
  return {
    startAt: "2026-04-20T08:30:00.000Z",
    endAt: "2026-04-20T09:00:30.000Z",
    source: "manual",
    state: "confirmed",
    googleEventId: null,
    createdAt: "2026-04-20T08:00:00.000Z",
    updatedAt: "2026-04-20T08:00:00.000Z",
    ...overrides,
  };
}

describe("useScheduleBlockNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fires an end notification once per block when its end time passes", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Deep focus" });
    const block = buildBlock({ id: "block-1", taskId: task.id });
    const tasksById = new Map([[task.id, task]]);

    render(
      <Harness startEnabled={false} endEnabled scheduleBlocks={[block]} tasksById={tasksById} />,
    );

    await act(async () => {
      vi.setSystemTime(new Date("2026-04-20T09:01:00.000Z"));
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith(
      "Deep focus",
      expect.objectContaining({ body: expect.stringContaining("Ended"), tag: "block-1:end" }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).toHaveBeenCalledTimes(1);
  });

  it("fires a start notification once per block when its start time passes", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Kickoff" });
    const block = buildBlock({
      id: "block-start",
      taskId: task.id,
      startAt: "2026-04-20T09:00:30.000Z",
      endAt: "2026-04-20T09:30:00.000Z",
    });

    render(
      <Harness
        startEnabled
        endEnabled={false}
        scheduleBlocks={[block]}
        tasksById={new Map([[task.id, task]])}
      />,
    );

    await act(async () => {
      vi.setSystemTime(new Date("2026-04-20T09:01:00.000Z"));
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith(
      "Kickoff",
      expect.objectContaining({ body: expect.stringContaining("Started"), tag: "block-start:start" }),
    );
  });

  it("fires both start and end notifications when both settings are enabled", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Sprint" });
    const block = buildBlock({
      id: "block-both",
      taskId: task.id,
      startAt: "2026-04-20T09:00:30.000Z",
      endAt: "2026-04-20T09:02:00.000Z",
    });

    render(
      <Harness startEnabled endEnabled scheduleBlocks={[block]} tasksById={new Map([[task.id, task]])} />,
    );

    await act(async () => {
      vi.setSystemTime(new Date("2026-04-20T09:03:00.000Z"));
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).toHaveBeenCalledTimes(2);
    const tags = ctor.mock.calls.map((call) => (call[1] as NotificationOptions).tag);
    expect(tags).toContain("block-both:start");
    expect(tags).toContain("block-both:end");
  });

  it("skips blocks that ended before notifications were enabled", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Stale focus" });
    const block = buildBlock({
      id: "block-stale",
      taskId: task.id,
      startAt: "2026-04-20T07:00:00.000Z",
      endAt: "2026-04-20T08:30:00.000Z",
    });

    render(
      <Harness
        startEnabled={false}
        endEnabled
        scheduleBlocks={[block]}
        tasksById={new Map([[task.id, task]])}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).not.toHaveBeenCalled();
  });

  it("fires a delayed notification after the browser regains focus", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Delayed focus" });
    const block = buildBlock({
      id: "block-delayed",
      taskId: task.id,
      startAt: "2026-04-20T09:00:00.000Z",
      endAt: "2026-04-20T09:10:00.000Z",
    });

    render(
      <Harness
        startEnabled={false}
        endEnabled
        scheduleBlocks={[block]}
        tasksById={new Map([[task.id, task]])}
      />,
    );

    await act(async () => {
      vi.setSystemTime(new Date("2026-04-20T10:30:00.000Z"));
      window.dispatchEvent(new Event("focus"));
    });

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith(
      "Delayed focus",
      expect.objectContaining({ body: expect.stringContaining("Ended") }),
    );
  });

  it("does not request permission automatically on mount", () => {
    const { requestPermission } = stubNotification("default");

    render(<Harness startEnabled endEnabled scheduleBlocks={[]} tasksById={new Map()} />);

    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("does not fire notifications while both settings are disabled", async () => {
    const { ctor } = stubNotification("granted");
    const task = buildTask({ id: "task-1", title: "Quiet block" });
    const block = buildBlock({ id: "block-disabled", taskId: task.id });

    render(
      <Harness
        startEnabled={false}
        endEnabled={false}
        scheduleBlocks={[block]}
        tasksById={new Map([[task.id, task]])}
      />,
    );

    await act(async () => {
      vi.setSystemTime(new Date("2026-04-20T09:01:00.000Z"));
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(ctor).not.toHaveBeenCalled();
  });
});
