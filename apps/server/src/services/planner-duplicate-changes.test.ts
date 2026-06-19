import type { Task, TaskPriority } from "@timefraim/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { duplicateTaskInContext } from "./planner-duplicate-changes.js";
import type { DraftHandlerContext, DraftToApply } from "./planner-service-types.js";

const baseTask: Task = {
  id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
  title: "Journal",
  notes: "Write down the day.",
  estimatedMinutes: 30,
  status: "planned",
  priority: "medium",
  category: "personal",
  scheduledBlockId: null,
  togglProjectId: null,
  completedOnDate: null,
  createdAt: "2026-04-20T08:00:00.000Z",
  updatedAt: "2026-04-20T08:00:00.000Z",
};

const priorities = ["urgent", "high", "medium", "low"] as const;

function buildContext(args: {
  sourceTask: Task;
  payload: Record<string, unknown>;
}) {
  const createdTask = {
    ...args.sourceTask,
    id: "1e3c20e8-d803-4f90-b6f9-92dcff10da57",
  };
  const repository = {
    getTask: vi.fn().mockResolvedValue(args.sourceTask),
    createTask: vi.fn().mockResolvedValue(createdTask),
    listScheduleBlocksForRange: vi.fn().mockResolvedValue([]),
    listCalendarEventsForRange: vi.fn().mockResolvedValue([]),
    createScheduleBlock: vi.fn().mockResolvedValue({
      id: "2f3c20e8-d803-4f90-b6f9-92dcff10da57",
      taskId: createdTask.id,
      startAt: "2026-04-20T16:00:00.000Z",
      endAt: "2026-04-20T16:30:00.000Z",
      source: "manual",
      state: "confirmed",
      googleEventId: null,
      createdAt: "2026-04-20T08:00:00.000Z",
      updatedAt: "2026-04-20T08:00:00.000Z",
    }),
    updateTask: vi.fn().mockResolvedValue(createdTask),
    createAuditLog: vi.fn().mockResolvedValue(undefined),
  };
  const markApplied = vi.fn().mockResolvedValue(null);

  const draft: DraftToApply = {
    id: "draft-1",
    ownerUserId: "user-1",
    kind: "task.duplicate",
    payload: args.payload,
    diffSummary: "Duplicate task",
    status: "pending",
  };

  const context: DraftHandlerContext = {
    actorRole: "user",
    client: {} as never,
    draft,
    googleConnected: false,
    syncPlannerBlocksToCalendar: false,
    markApplied,
    repository: repository as never,
    sideEffects: [],
  };

  return { context, repository };
}

function taskWithPriority(priority: TaskPriority): Task {
  return { ...baseTask, priority };
}

describe("duplicateTaskInContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(priorities)("preserves %s priority for queue-only duplicates", async (priority) => {
    const { context, repository } = buildContext({
      sourceTask: taskWithPriority(priority),
      payload: { sourceTaskId: baseTask.id },
    });

    await duplicateTaskInContext(context);

    expect(repository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ priority }),
      expect.anything(),
    );
  });

  it.each(priorities)("preserves %s priority for timeline duplicates", async (priority) => {
    const { context, repository } = buildContext({
      sourceTask: taskWithPriority(priority),
      payload: {
        sourceTaskId: baseTask.id,
        startAt: "2026-04-20T16:00:00.000Z",
        endAt: "2026-04-20T16:30:00.000Z",
      },
    });

    await duplicateTaskInContext(context);

    expect(repository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ priority }),
      expect.anything(),
    );
  });
});
