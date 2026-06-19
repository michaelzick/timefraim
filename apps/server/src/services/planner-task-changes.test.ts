import type { Task } from "@timefraim/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/date.js", () => ({
  todayIsoDate: () => "2026-04-20",
}));

import { applyTaskUpdateDraft } from "./planner-task-changes.js";
import type { DraftHandlerContext, DraftToApply } from "./planner-service-types.js";

const baseTask: Task = {
  id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
  title: "Journal",
  notes: null,
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

function buildContext(args: {
  currentTask: Task;
  payload: Record<string, unknown>;
}) {
  const repository = {
    getTask: vi.fn().mockResolvedValue(args.currentTask),
    updateTask: vi.fn().mockResolvedValue({ ...args.currentTask }),
    getScheduleBlock: vi.fn(),
    getScheduleBlockByTaskId: vi.fn(),
    createAuditLog: vi.fn().mockResolvedValue(undefined),
  };
  const markApplied = vi.fn().mockResolvedValue(null);

  const draft: DraftToApply = {
    id: "draft-1",
    ownerUserId: "user-1",
    kind: "task.update",
    payload: args.payload,
    diffSummary: "Update task",
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

describe("applyTaskUpdateDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults completedOnDate to today when status becomes done and no date was given", async () => {
    const { context, repository } = buildContext({
      currentTask: baseTask,
      payload: { taskId: baseTask.id, status: "done" },
    });

    await applyTaskUpdateDraft(context);

    expect(repository.updateTask).toHaveBeenCalledWith(
      baseTask.id,
      expect.objectContaining({ status: "done", completedOnDate: "2026-04-20" }),
      expect.anything(),
    );
  });

  it("uses the explicit completedOnDate from the payload when present", async () => {
    const { context, repository } = buildContext({
      currentTask: baseTask,
      payload: { taskId: baseTask.id, status: "done", completedOnDate: "2026-04-18" },
    });

    await applyTaskUpdateDraft(context);

    expect(repository.updateTask).toHaveBeenCalledWith(
      baseTask.id,
      expect.objectContaining({ completedOnDate: "2026-04-18" }),
      expect.anything(),
    );
  });

  it("preserves the currently recorded completedOnDate when still done", async () => {
    const { context, repository } = buildContext({
      currentTask: { ...baseTask, status: "done", completedOnDate: "2026-04-15" },
      payload: { taskId: baseTask.id, status: "done" },
    });

    await applyTaskUpdateDraft(context);

    expect(repository.updateTask).toHaveBeenCalledWith(
      baseTask.id,
      expect.objectContaining({ completedOnDate: "2026-04-15" }),
      expect.anything(),
    );
  });

  it("clears completedOnDate when status leaves done", async () => {
    const { context, repository } = buildContext({
      currentTask: { ...baseTask, status: "done", completedOnDate: "2026-04-15" },
      payload: { taskId: baseTask.id, status: "planned" },
    });

    await applyTaskUpdateDraft(context);

    expect(repository.updateTask).toHaveBeenCalledWith(
      baseTask.id,
      expect.objectContaining({ status: "planned", completedOnDate: null }),
      expect.anything(),
    );
  });

  it("does not touch completedOnDate when status is not part of the payload", async () => {
    const { context, repository } = buildContext({
      currentTask: baseTask,
      payload: { taskId: baseTask.id, title: "Renamed" },
    });

    await applyTaskUpdateDraft(context);

    const patch = repository.updateTask.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("completedOnDate");
  });

  it("does not touch priority when priority is not part of the payload", async () => {
    const { context, repository } = buildContext({
      currentTask: baseTask,
      payload: { taskId: baseTask.id, estimatedMinutes: 45 },
    });

    await applyTaskUpdateDraft(context);

    expect(repository.updateTask).toHaveBeenCalledWith(
      baseTask.id,
      { estimatedMinutes: 45 },
      expect.anything(),
    );
  });

  it("passes category through to the updateTask patch", async () => {
    const { context, repository } = buildContext({
      currentTask: { ...baseTask, category: "personal" },
      payload: { taskId: baseTask.id, category: "work" },
    });

    await applyTaskUpdateDraft(context);

    expect(repository.updateTask).toHaveBeenCalledWith(
      baseTask.id,
      expect.objectContaining({ category: "work" }),
      expect.anything(),
    );
  });

  it("does not touch category when category is not part of the payload", async () => {
    const { context, repository } = buildContext({
      currentTask: baseTask,
      payload: { taskId: baseTask.id, title: "Renamed" },
    });

    await applyTaskUpdateDraft(context);

    const patch = repository.updateTask.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("category");
  });
});
