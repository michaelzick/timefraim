import type { ScheduleBlock, Task } from "@timefraim/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GoogleConnection } from "./google-calendar.ts";

vi.mock("../config/env.ts", () => ({
  env: {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
  },
}));

import {
  assertGoogleTasksAccess,
  deleteGoogleTask,
  getGoogleTasksAccessErrorMessage,
  upsertGoogleScheduledTask,
} from "./google-tasks.ts";
import { getGoogleScheduledTasksByIds, listGoogleScheduledTasks } from "./google-tasks-sync.ts";

const fetchMock = vi.fn<typeof fetch>();
const TASKS_PATH = "/tasks/v1/lists/%40default/tasks";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function requestUrl(input: RequestInfo | URL) {
  return input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
}

function requests() {
  return fetchMock.mock.calls.map(([input, init]) => ({
    method: init?.method ?? "GET",
    url: requestUrl(input),
    body: typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : undefined,
  }));
}

const connection: GoogleConnection = {
  accessToken: "google-token",
  refreshToken: "refresh-token",
  expiresAt: "2099-04-11T12:00:00.000Z",
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
  category: "personal",
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

let listResponses: unknown[];
let getResponses: unknown[];

describe("google-tasks integration", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    listResponses = [{ items: [] }];
    getResponses = [];
    fetchMock.mockImplementation((input, init) => {
      const url = requestUrl(input);
      const method = init?.method ?? "GET";
      if (url.pathname === "/tasks/v1/users/%40me/lists/%40default") return Promise.resolve(jsonResponse({ id: "@default" }));
      if (url.pathname === TASKS_PATH && method === "GET") return Promise.resolve(jsonResponse(listResponses.shift() ?? { items: [] }));
      if (url.pathname === TASKS_PATH && method === "POST") return Promise.resolve(jsonResponse({ id: "google-task-123" }));
      if (url.pathname.startsWith(`${TASKS_PATH}/`) && method === "GET") return Promise.resolve(jsonResponse(getResponses.shift() ?? {}));
      if (url.pathname.startsWith(`${TASKS_PATH}/`) && method === "PATCH") return Promise.resolve(jsonResponse({ id: "google-task-123" }));
      if (url.pathname.startsWith(`${TASKS_PATH}/`) && method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(jsonResponse({ error: { message: "unexpected request" } }, 500));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("checks access to the default task list", async () => {
    await assertGoogleTasksAccess(connection);

    expect(requests().map((request) => `${request.method} ${request.url.pathname}`)).toEqual([
      "GET /tasks/v1/users/%40me/lists/%40default",
    ]);
  });

  it("maps disabled API errors to a setup-focused message", () => {
    expect(
      getGoogleTasksAccessErrorMessage(
        new Error("Google Tasks API has not been used before or it is disabled."),
      ),
    ).toContain("Enable tasks.googleapis.com");
  });

  it("creates scheduled timeline blocks in the default Google Tasks list", async () => {
    const googleTaskId = await upsertGoogleScheduledTask({ connection, task, block });

    const insert = requests().find((request) => request.method === "POST");
    expect(insert?.url.pathname).toBe(TASKS_PATH);
    expect(insert?.body).toEqual({
      title: "Plan launch week",
      notes: "Outline the week.",
      status: "needsAction",
      due: "2026-04-06T00:00:00.000Z",
    });
    expect(googleTaskId).toBe("google-task-123");
  });

  it("lists scheduled tasks with completed and hidden entries across pages", async () => {
    listResponses = [
      {
        nextPageToken: "page-2",
        items: [
          {
            id: "google-task-123",
            title: "Plan launch week",
            status: "completed",
            due: "2026-04-06T00:00:00.000Z",
            updated: "2026-04-06T19:00:00.000Z",
            completed: "2026-04-06T18:55:00.000Z",
            hidden: true,
          },
        ],
      },
      {
        items: [
          {
            id: "google-task-456",
            title: "Send recap",
            status: "needsAction",
            due: "2026-04-06T00:00:00.000Z",
            updated: "2026-04-06T20:00:00.000Z",
          },
        ],
      },
    ];

    const records = await listGoogleScheduledTasks({
      connection,
      dueMin: "2026-04-06T00:00:00.000Z",
      dueMax: "2026-04-06T23:59:59.999Z",
      updatedMin: "2026-04-06T09:00:00.000Z",
    });

    const [firstPage, secondPage] = requests();
    expect(Object.fromEntries(firstPage?.url.searchParams ?? [])).toEqual({
      dueMin: "2026-04-06T00:00:00.000Z",
      dueMax: "2026-04-06T23:59:59.999Z",
      maxResults: "100",
      showCompleted: "true",
      showDeleted: "false",
      showHidden: "true",
      updatedMin: "2026-04-06T09:00:00.000Z",
    });
    expect(secondPage?.url.searchParams.get("pageToken")).toBe("page-2");
    expect(records).toEqual([
      {
        id: "google-task-123",
        title: "Plan launch week",
        status: "completed",
        due: "2026-04-06T00:00:00.000Z",
        updated: "2026-04-06T19:00:00.000Z",
        completed: "2026-04-06T18:55:00.000Z",
        deleted: false,
        hidden: true,
      },
      {
        id: "google-task-456",
        title: "Send recap",
        status: "needsAction",
        due: "2026-04-06T00:00:00.000Z",
        updated: "2026-04-06T20:00:00.000Z",
        completed: null,
        deleted: false,
        hidden: false,
      },
    ]);
  });

  it("fetches exact mirrored scheduled task ids", async () => {
    getResponses = [
      {
        id: "google-task-123",
        title: "Plan launch week",
        status: "completed",
        due: "2026-04-06T00:00:00.000Z",
        updated: "2026-04-06T19:00:00.000Z",
        completed: "2026-04-06T18:55:00.000Z",
        hidden: true,
      },
      {
        id: "google-task-456",
        title: "Send recap",
        status: "needsAction",
        due: "2026-04-06T00:00:00.000Z",
        updated: "2026-04-06T20:00:00.000Z",
      },
    ];

    const records = await getGoogleScheduledTasksByIds({
      connection,
      taskIds: ["google-task-123", "google-task-123", "google-task-456"],
    });

    expect(requests().map((request) => request.url.pathname)).toEqual([
      `${TASKS_PATH}/google-task-123`,
      `${TASKS_PATH}/google-task-456`,
    ]);
    expect(records).toEqual([
      expect.objectContaining({ id: "google-task-123", status: "completed", hidden: true }),
      expect.objectContaining({ id: "google-task-456", status: "needsAction", completed: null }),
    ]);
  });

  it("skips mirrored task ids Google no longer has", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: 404, message: "Not Found" } }, 404));

    const records = await getGoogleScheduledTasksByIds({ connection, taskIds: ["gone"] });

    expect(records).toEqual([]);
  });

  it("uses the local planner date and writes the time range into notes", async () => {
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

    const insert = requests().find((request) => request.method === "POST");
    expect(insert?.body).toEqual(
      expect.objectContaining({
        due: "2026-04-06T00:00:00.000Z",
        notes: "Outline the week.\n\nTimeFraim: Mon, Apr 6 5:00 PM to 5:45 PM (45 min)",
      }),
    );
  });

  it("patches the existing Google Task for timeline updates", async () => {
    await upsertGoogleScheduledTask({
      connection,
      task: { ...task, title: "Updated plan" },
      block: { ...block, googleTaskId: "google-task-123" },
    });

    const [patch] = requests();
    expect(patch?.method).toBe("PATCH");
    expect(patch?.url.pathname).toBe(`${TASKS_PATH}/google-task-123`);
    expect(patch?.body).toEqual(expect.objectContaining({ title: "Updated plan" }));
    expect(requests().some((request) => request.method === "POST")).toBe(false);
  });

  it("omits notes on status-only patches so Google keeps the existing footer", async () => {
    await upsertGoogleScheduledTask({
      connection,
      task: { ...task, status: "done" },
      block: { ...block, googleTaskId: "google-task-123" },
    });

    const [patch] = requests();
    expect(patch?.body).toEqual({ title: "Plan launch week", status: "completed" });
  });

  it("rebuilds notes on patches that carry the planner date and timezone", async () => {
    await upsertGoogleScheduledTask({
      connection,
      task,
      block: { ...block, googleTaskId: "google-task-123" },
      plannerDate: "2026-04-06",
      tzOffsetMinutes: 420,
    });

    const [patch] = requests();
    expect(patch?.body).toEqual(
      expect.objectContaining({
        notes: "Outline the week.\n\nTimeFraim: Mon, Apr 6 10:00 AM to 10:45 AM (45 min)",
      }),
    );
  });

  it("deletes Google Task mirrors from the default list", async () => {
    await deleteGoogleTask(connection, "google-task-123");

    expect(requests().map((request) => `${request.method} ${request.url.pathname}`)).toEqual([
      `DELETE ${TASKS_PATH}/google-task-123`,
    ]);
  });
});
