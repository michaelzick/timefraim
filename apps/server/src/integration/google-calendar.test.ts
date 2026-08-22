import type { ScheduleBlock, Task } from "@timefraim/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.ts", () => ({
  env: {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_CALENDAR_ID: "primary",
    GOOGLE_PLANNER_CALENDAR_ID: "Free Time Tasks",
  },
}));

import {
  deleteGoogleScheduleBlock,
  syncGoogleCalendarWindow,
  upsertGoogleScheduleBlock,
  type GoogleConnection,
} from "./google-calendar.ts";

const fetchMock = vi.fn<typeof fetch>();

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
  notes: "Outline the week and protect deep-work blocks.",
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
  state: "synced",
  googleEventId: null,
  createdAt: "2026-04-06T08:00:00.000Z",
  updatedAt: "2026-04-06T08:00:00.000Z",
};

const FREE_TIME_CALENDAR_PATH = "/calendar/v3/calendars/free-time-tasks-id%40group.calendar.google.com/events";

let calendarListItems: unknown[];
let colorsPayload: unknown;
let eventsPayload: unknown;
let deleteResponses: Response[];

describe("google-calendar integration", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    calendarListItems = [
      {
        id: "allowed@example.com",
        summary: "Primary",
        primary: true,
        backgroundColor: "#9fe1e7",
        foregroundColor: "#1d1d1d",
        colorId: "14",
      },
      { id: "free-time-tasks-id@group.calendar.google.com", summary: "Free Time Tasks" },
    ];
    colorsPayload = {
      calendar: { "14": { background: "#9fe1e7", foreground: "#1d1d1d" } },
      event: { "11": { background: "#d50000", foreground: "#ffffff" } },
    };
    eventsPayload = { items: [] };
    deleteResponses = [];
    fetchMock.mockImplementation((input, init) => {
      const url = requestUrl(input);
      const method = init?.method ?? "GET";
      if (url.pathname.endsWith("/users/me/calendarList")) return Promise.resolve(jsonResponse({ items: calendarListItems }));
      if (url.pathname.endsWith("/colors")) return Promise.resolve(jsonResponse(colorsPayload));
      if (method === "GET" && url.pathname.endsWith("/events")) return Promise.resolve(jsonResponse(eventsPayload));
      if (method === "POST") return Promise.resolve(jsonResponse({ id: "google-event-123" }));
      if (method === "DELETE") return Promise.resolve(deleteResponses.shift() ?? new Response(null, { status: 204 }));
      return Promise.resolve(jsonResponse({ error: { message: "unexpected request" } }, 500));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("reads blocker events with explicit Google event colors", async () => {
    eventsPayload = {
      items: [
        {
          id: "evt-1",
          summary: "Investor breakfast",
          colorId: "11",
          start: { dateTime: "2026-04-06T15:00:00.000Z" },
          end: { dateTime: "2026-04-06T16:00:00.000Z" },
          updated: "2026-04-06T07:30:00.000Z",
        },
      ],
    };

    const records = await syncGoogleCalendarWindow(connection, {
      timeMin: "2026-04-06T00:00:00.000Z",
      timeMax: "2026-04-07T00:00:00.000Z",
    });

    const eventsRequest = requests().find((request) => request.method === "GET" && request.url.pathname.endsWith("/events"));
    expect(eventsRequest?.url.pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(eventsRequest?.url.searchParams.get("timeMin")).toBe("2026-04-06T00:00:00.000Z");
    expect(eventsRequest?.url.searchParams.get("timeMax")).toBe("2026-04-07T00:00:00.000Z");
    expect(eventsRequest?.url.searchParams.get("singleEvents")).toBe("true");
    expect(records).toEqual([
      expect.objectContaining({
        externalEventId: "evt-1",
        title: "Investor breakfast",
        backgroundColor: "#d50000",
        foregroundColor: "#ffffff",
        sourceCalendarName: "Primary",
      }),
    ]);
  });

  it("falls back to the synced calendar color when an event has no explicit color", async () => {
    eventsPayload = {
      items: [
        {
          id: "evt-1",
          summary: "Investor breakfast",
          start: { dateTime: "2026-04-06T15:00:00.000Z" },
          end: { dateTime: "2026-04-06T16:00:00.000Z" },
          updated: "2026-04-06T07:30:00.000Z",
        },
      ],
    };

    const records = await syncGoogleCalendarWindow(connection, {
      timeMin: "2026-04-06T00:00:00.000Z",
      timeMax: "2026-04-07T00:00:00.000Z",
    });

    expect(records).toEqual([
      expect.objectContaining({ backgroundColor: "#9fe1e7", foregroundColor: "#1d1d1d" }),
    ]);
  });

  it("returns null colors when neither event nor calendar colors can be resolved", async () => {
    calendarListItems = [{ id: "allowed@example.com", summary: "Primary", primary: true }];
    colorsPayload = { calendar: {}, event: {} };
    eventsPayload = {
      items: [
        {
          id: "evt-1",
          summary: "Investor breakfast",
          start: { dateTime: "2026-04-06T15:00:00.000Z" },
          end: { dateTime: "2026-04-06T16:00:00.000Z" },
          updated: "2026-04-06T07:30:00.000Z",
        },
      ],
    };

    const records = await syncGoogleCalendarWindow(connection, {
      timeMin: "2026-04-06T00:00:00.000Z",
      timeMax: "2026-04-07T00:00:00.000Z",
    });

    expect(records).toEqual([expect.objectContaining({ backgroundColor: null, foregroundColor: null })]);
  });

  it("creates planner-managed schedule blocks in the Free Time Tasks calendar with free status", async () => {
    const googleEventId = await upsertGoogleScheduleBlock({ connection, task, block });

    const insert = requests().find((request) => request.method === "POST");
    expect(insert?.url.pathname).toBe(FREE_TIME_CALENDAR_PATH);
    expect(insert?.body).toEqual(expect.objectContaining({ transparency: "transparent", summary: "Plan launch week" }));
    expect(googleEventId).toBe("google-event-123");
  });

  it("falls back to the synced calendar when deleting an older event outside the planner calendar", async () => {
    deleteResponses = [
      jsonResponse({ error: { code: 404, message: "Not Found" } }, 404),
      new Response(null, { status: 204 }),
    ];

    await deleteGoogleScheduleBlock(connection, "google-event-123");

    const deletes = requests().filter((request) => request.method === "DELETE");
    expect(deletes.map((request) => request.url.pathname)).toEqual([
      `${FREE_TIME_CALENDAR_PATH}/google-event-123`,
      "/calendar/v3/calendars/primary/events/google-event-123",
    ]);
  });
});
