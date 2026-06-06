import type { CalendarEventView, ScheduleBlock } from "@timefraim/shared";
import { describe, expect, it, vi } from "vitest";
import { buildTask } from "@/test/fixtures";
import {
  buildPlannerTaskHref,
  buildPlannerTaskHrefForTask,
  findNextOpenTimelineSlot,
  groupTasksByKanbanStatus,
  moveTaskOnKanban,
} from "@/features/kanban/kanban-utils";

const DATE = "2026-04-06";

function buildScheduleBlock(overrides: Partial<ScheduleBlock> = {}): ScheduleBlock {
  return {
    id: "block-1f8f9660-0000-4000-8000-000000000001",
    taskId: "task-1f8f9660-0000-4000-8000-000000000001",
    startAt: new Date(`${DATE}T09:00:00`).toISOString(),
    endAt: new Date(`${DATE}T10:00:00`).toISOString(),
    source: "manual",
    state: "confirmed",
    googleEventId: null,
    googleTaskId: null,
    createdAt: "2026-04-06T08:00:00.000Z",
    updatedAt: "2026-04-06T08:00:00.000Z",
    ...overrides,
  };
}

const calendarEvents: CalendarEventView[] = [];

describe("kanban-utils", () => {
  it("groups scheduled tasks by their timeline commitment and sorts urgent work first", () => {
    const scheduledTask = buildTask({
      id: "task-1f8f9660-0000-4000-8000-000000000010",
      priority: "low",
      scheduledBlockId: "block-1",
      status: "planned",
    });
    const urgentTask = buildTask({
      id: "task-1f8f9660-0000-4000-8000-000000000011",
      priority: "urgent",
      title: "Fix production issue",
    });

    const groups = groupTasksByKanbanStatus([scheduledTask, urgentTask, buildTask()]);

    expect(groups.scheduled).toEqual([scheduledTask]);
    expect(groups.planned.map((task) => task.priority)).toEqual(["urgent", "medium"]);
  });

  it("builds planner task deep links with the selected board date", () => {
    expect(buildPlannerTaskHref(DATE, "task-1f8f9660-0000-4000-8000-000000000001")).toBe(
      "/?date=2026-04-06&task=task-1f8f9660-0000-4000-8000-000000000001",
    );
  });

  it("builds scheduled task planner links with the scheduled date", () => {
    const task = buildTask({
      scheduledBlockId: "block-1f8f9660-0000-4000-8000-000000000001",
      scheduledStartAt: "2026-04-08T16:00:00.000Z",
    });

    expect(buildPlannerTaskHrefForTask(task, DATE, [])).toBe(
      "/?date=2026-04-08&task=task-1f8f9660-0000-4000-8000-000000000001",
    );
  });

  it("finds the next open timeline slot after existing commitments", () => {
    const slot = findNextOpenTimelineSlot({
      calendarEvents,
      date: DATE,
      durationMinutes: 30,
      scheduleBlocks: [buildScheduleBlock()],
    });

    expect(slot).toEqual({
      startAt: new Date(`${DATE}T10:00:00`).toISOString(),
      endAt: new Date(`${DATE}T10:30:00`).toISOString(),
    });
  });

  it("schedules an unscheduled task when moved into Scheduled", async () => {
    const task = buildTask({ estimatedMinutes: 45 });
    const onCreateScheduleBlock = vi.fn().mockResolvedValue(undefined);
    const onDeleteScheduleBlock = vi.fn().mockResolvedValue(undefined);
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);

    await moveTaskOnKanban({
      calendarEvents,
      date: DATE,
      onCreateScheduleBlock,
      onDeleteScheduleBlock,
      onUpdateTask,
      scheduleBlocks: [],
      targetStatus: "scheduled",
      task,
    });

    expect(onCreateScheduleBlock).toHaveBeenCalledWith({
      taskId: task.id,
      startAt: new Date(`${DATE}T09:00:00`).toISOString(),
      endAt: new Date(`${DATE}T09:45:00`).toISOString(),
      source: "manual",
      plannerDate: DATE,
      tzOffsetMinutes: new Date(`${DATE}T12:00:00`).getTimezoneOffset(),
    });
    expect(onUpdateTask).not.toHaveBeenCalled();
    expect(onDeleteScheduleBlock).not.toHaveBeenCalled();
  });

  it("removes the timeline block when a scheduled task returns to Inbox", async () => {
    const block = buildScheduleBlock();
    const task = buildTask({ scheduledBlockId: block.id, status: "scheduled" });
    const onCreateScheduleBlock = vi.fn().mockResolvedValue(undefined);
    const onDeleteScheduleBlock = vi.fn().mockResolvedValue(undefined);
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);

    await moveTaskOnKanban({
      calendarEvents,
      date: DATE,
      onCreateScheduleBlock,
      onDeleteScheduleBlock,
      onUpdateTask,
      scheduleBlocks: [block],
      targetStatus: "inbox",
      task,
    });

    expect(onDeleteScheduleBlock).toHaveBeenCalledWith(block.id);
    expect(onUpdateTask).toHaveBeenCalledWith(task.id, expect.objectContaining({ status: "inbox" }));
    expect(onCreateScheduleBlock).not.toHaveBeenCalled();
  });

  it("sets the board date as the completion date when moved to Done", async () => {
    const task = buildTask();
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);

    await moveTaskOnKanban({
      calendarEvents,
      date: DATE,
      onCreateScheduleBlock: vi.fn().mockResolvedValue(undefined),
      onDeleteScheduleBlock: vi.fn().mockResolvedValue(undefined),
      onUpdateTask,
      scheduleBlocks: [],
      targetStatus: "done",
      task,
    });

    expect(onUpdateTask).toHaveBeenCalledWith(
      task.id,
      expect.objectContaining({ completedOnDate: DATE, status: "done" }),
    );
  });
});
