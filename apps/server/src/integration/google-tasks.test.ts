import type { ScheduleBlock, Task } from "@timefraim/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GoogleConnection } from "./google-calendar.js";

const {
  oauthSetCredentials,
  tasksDelete,
  tasksFactory,
  tasksInsert,
  tasklistsGet,
  tasksPatch,
} = vi.hoisted(() => ({
  oauthSetCredentials: vi.fn(),
  tasksDelete: vi.fn(),
  tasksFactory: vi.fn(),
  tasksInsert: vi.fn(),
  tasklistsGet: vi.fn(),
  tasksPatch: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  env: {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
  },
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials = oauthSetCredentials;
      },
    },
    tasks: tasksFactory,
  },
}));

import {
  assertGoogleTasksAccess,
  deleteGoogleTask,
  getGoogleTasksAccessErrorMessage,
  upsertGoogleScheduledTask,
} from "./google-tasks.js";

const connection: GoogleConnection = {
  accessToken: "google-token",
  refreshToken: "refresh-token",
  expiresAt: "2026-04-11T12:00:00.000Z",
  calendarId: "primary",
  plannerCalendarId: "Free Time Tasks",
  email: "allowed@example.com",
};

const task: Task = {
  id: "84a87ef5-f143-4b9b-9f6b-b7c608d72ac1",
  title: "Plan launch week",
  notes: "Outline the week.",
  estimatedMinutes: 45,
  status: "scheduled",
  priority: "high",
  scheduledBlockId: "3f441c84-f3c7-4f40-8e88-8f2a6520f528",
  togglProjectId: null,
  completedOnDate: null,
  createdAt: "2026-04-06T08:00:00.000Z",
  updatedAt: "2026-04-06T08:00:00.000Z",
};

const block: ScheduleBlock = {
  id: "3f441c84-f3c7-4f40-8e88-8f2a6520f528",
  taskId: task.id,
  startAt: "2026-04-06T17:00:00.000Z",
  endAt: "2026-04-06T17:45:00.000Z",
  source: "manual",
  state: "sync_pending",
  googleEventId: null,
  googleTaskId: null,
  createdAt: "2026-04-06T08:00:00.000Z",
  updatedAt: "2026-04-06T08:00:00.000Z",
};

describe("google-tasks integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tasksFactory.mockReturnValue({
      tasks: {
        delete: tasksDelete,
        insert: tasksInsert,
        patch: tasksPatch,
      },
      tasklists: {
        get: tasklistsGet,
      },
    });
  });

  it("checks access to the default task list", async () => {
    await assertGoogleTasksAccess(connection);

    expect(tasklistsGet).toHaveBeenCalledWith({ tasklist: "@default" });
  });

  it("maps disabled API errors to a setup-focused message", () => {
    expect(
      getGoogleTasksAccessErrorMessage(
        new Error("Google Tasks API has not been used before or it is disabled."),
      ),
    ).toContain("Enable tasks.googleapis.com");
  });

  it("creates scheduled timeline blocks in the default Google Tasks list", async () => {
    tasksInsert.mockResolvedValue({ data: { id: "google-task-123" } });

    const googleTaskId = await upsertGoogleScheduledTask({ connection, task, block });

    expect(tasksInsert).toHaveBeenCalledWith({
      tasklist: "@default",
      requestBody: {
        title: "Plan launch week",
        notes: "Outline the week.",
        status: "needsAction",
        due: "2026-04-06T00:00:00.000Z",
      },
    });
    expect(googleTaskId).toBe("google-task-123");
  });

  it("uses the local planner date and writes the time range into notes", async () => {
    tasksInsert.mockResolvedValue({ data: { id: "google-task-123" } });

    await upsertGoogleScheduledTask({
      connection,
      task,
      block: {
        ...block,
        startAt: "2026-04-07T00:00:00.000Z",
        endAt: "2026-04-07T00:45:00.000Z",
      },
      plannerDate: "2026-04-06",
      tzOffsetMinutes: 420,
    });

    expect(tasksInsert).toHaveBeenCalledWith({
      tasklist: "@default",
      requestBody: expect.objectContaining({
        due: "2026-04-06T00:00:00.000Z",
        notes: "Outline the week.\n\nTimeFraim: Mon, Apr 6 5:00 PM to 5:45 PM (45 min)",
      }),
    });
  });

  it("patches the existing Google Task for timeline updates", async () => {
    await upsertGoogleScheduledTask({
      connection,
      task: { ...task, title: "Updated plan" },
      block: { ...block, googleTaskId: "google-task-123" },
    });

    expect(tasksPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        tasklist: "@default",
        task: "google-task-123",
        requestBody: expect.objectContaining({ title: "Updated plan" }),
      }),
    );
    expect(tasksInsert).not.toHaveBeenCalled();
  });

  it("deletes Google Task mirrors from the default list", async () => {
    await deleteGoogleTask(connection, "google-task-123");

    expect(tasksDelete).toHaveBeenCalledWith({
      tasklist: "@default",
      task: "google-task-123",
    });
  });
});
