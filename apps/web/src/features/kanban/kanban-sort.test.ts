import type { ScheduleBlock, Task } from "@timefraim/shared";
import { describe, expect, it } from "vitest";
import { buildTask } from "@/test/fixtures";
import {
  compareKanbanTasks,
  DEFAULT_COLUMN_SORT_MODES,
  getKanbanSortDate,
  sortColumnTasks,
  sortGroupedColumns,
} from "@/features/kanban/kanban-sort";
import type { KanbanStatus } from "@/features/kanban/kanban-types";

function buildScheduleBlock(overrides: Partial<ScheduleBlock> = {}): ScheduleBlock {
  return {
    id: "block-1",
    taskId: "task-1",
    startAt: "2026-04-06T09:00:00.000Z",
    endAt: "2026-04-06T10:00:00.000Z",
    source: "manual",
    state: "confirmed",
    googleEventId: null,
    googleTaskId: null,
    createdAt: "2026-04-06T08:00:00.000Z",
    updatedAt: "2026-04-06T08:00:00.000Z",
    ...overrides,
  };
}

const early = buildTask({ id: "a", scheduledStartAt: "2026-04-01T09:00:00.000Z" });
const late = buildTask({ id: "b", scheduledStartAt: "2026-04-10T09:00:00.000Z" });

describe("sortColumnTasks", () => {
  it("orders by scheduled date ascending (oldest first)", () => {
    expect(sortColumnTasks([late, early], "date-asc", []).map((task) => task.id)).toEqual(["a", "b"]);
  });

  it("orders by scheduled date descending (newest first)", () => {
    expect(sortColumnTasks([early, late], "date-desc", []).map((task) => task.id)).toEqual(["b", "a"]);
  });

  it("falls back to the schedule block start when scheduledStartAt is missing", () => {
    const blocked = buildTask({ id: "blocked", scheduledStartAt: null, scheduledBlockId: "block-9" });
    const block = buildScheduleBlock({ id: "block-9", startAt: "2026-03-01T09:00:00.000Z" });

    expect(sortColumnTasks([early, blocked], "date-asc", [block]).map((task) => task.id)).toEqual([
      "blocked",
      "a",
    ]);
  });

  it("falls back to createdAt when no scheduled start or block is available", () => {
    const oldUnscheduled = buildTask({
      id: "old",
      scheduledStartAt: null,
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    expect(sortColumnTasks([early, oldUnscheduled], "date-asc", []).map((task) => task.id)).toEqual([
      "old",
      "a",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [late, early];
    sortColumnTasks(input, "date-asc", []);
    expect(input.map((task) => task.id)).toEqual(["b", "a"]);
  });

  it("priority mode keeps the existing priority ordering", () => {
    const urgent = buildTask({ id: "u", priority: "urgent" });
    const low = buildTask({ id: "l", priority: "low" });

    expect(sortColumnTasks([low, urgent], "priority", []).map((task) => task.id)).toEqual(
      [low, urgent].sort(compareKanbanTasks).map((task) => task.id),
    );
    expect(sortColumnTasks([low, urgent], "priority", []).map((task) => task.id)).toEqual(["u", "l"]);
  });
});

describe("getKanbanSortDate", () => {
  it("prefers scheduledStartAt, then the block start, then createdAt", () => {
    expect(getKanbanSortDate(buildTask({ scheduledStartAt: "2026-04-02T00:00:00.000Z" }), [])).toBe(
      "2026-04-02T00:00:00.000Z",
    );

    const blocked = buildTask({ scheduledStartAt: null, scheduledBlockId: "block-x" });
    const block = buildScheduleBlock({ id: "block-x", startAt: "2026-04-03T00:00:00.000Z" });
    expect(getKanbanSortDate(blocked, [block])).toBe("2026-04-03T00:00:00.000Z");

    expect(
      getKanbanSortDate(buildTask({ scheduledStartAt: null, createdAt: "2026-04-04T00:00:00.000Z" }), []),
    ).toBe("2026-04-04T00:00:00.000Z");
  });
});

describe("sortGroupedColumns", () => {
  it("sorts each column by its own mode and leaves the others untouched", () => {
    const inboxEarly = buildTask({ id: "ie", scheduledStartAt: "2026-04-01T00:00:00.000Z", priority: "low" });
    const inboxLate = buildTask({ id: "il", scheduledStartAt: "2026-04-09T00:00:00.000Z", priority: "urgent" });
    const plannedLow = buildTask({ id: "pl", priority: "low" });
    const plannedUrgent = buildTask({ id: "pu", priority: "urgent" });

    const grouped: Record<KanbanStatus, Task[]> = {
      inbox: [inboxLate, inboxEarly],
      planned: [plannedLow, plannedUrgent],
      scheduled: [],
      done: [],
    };

    const result = sortGroupedColumns(grouped, { ...DEFAULT_COLUMN_SORT_MODES, inbox: "date-asc" }, []);

    expect(result.inbox.map((task) => task.id)).toEqual(["ie", "il"]);
    expect(result.planned.map((task) => task.id)).toEqual(["pu", "pl"]);
  });
});
