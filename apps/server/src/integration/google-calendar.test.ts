import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleBlock, Task } from "@timefraim/shared";

const {
  calendarFactory,
  calendarListList,
  colorsGet,
  eventsDelete,
  eventsInsert,
  eventsList,
  eventsUpdate,
  oauthSetCredentials,
} = vi.hoisted(() => ({
  calendarFactory: vi.fn(),
  calendarListList: vi.fn(),
  colorsGet: vi.fn(),
  eventsDelete: vi.fn(),
  eventsInsert: vi.fn(),
  eventsList: vi.fn(),
  eventsUpdate: vi.fn(),
  oauthSetCredentials: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  env: {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_CALENDAR_ID: "primary",
    GOOGLE_PLANNER_CALENDAR_ID: "Free Time Tasks",
  },
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials = oauthSetCredentials;
      },
    },
    calendar: calendarFactory,
  },
}));

import {
  deleteGoogleScheduleBlock,
  syncGoogleCalendarWindow,
  upsertGoogleScheduleBlock,
  type GoogleConnection,
} from "./google-calendar.js";

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
  notes: "Outline the week and protect deep-work blocks.",
  estimatedMinutes: 45,
  status: "scheduled",
  priority: "high",
  scheduledBlockId: "3f441c84-f3c7-4f40-8e88-8f2a6520f528",
  togglProjectId: null,
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

describe("google-calendar integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calendarFactory.mockReturnValue({
      calendarList: { list: calendarListList },
      colors: { get: colorsGet },
      events: {
        list: eventsList,
        insert: eventsInsert,
        update: eventsUpdate,
        delete: eventsDelete,
      },
    });
    calendarListList.mockResolvedValue({
      data: {
        items: [
          {
            id: "allowed@example.com",
            summary: "Primary",
            primary: true,
            backgroundColor: "#9fe1e7",
            foregroundColor: "#1d1d1d",
            colorId: "14",
          },
          {
            id: "free-time-tasks-id@group.calendar.google.com",
            summary: "Free Time Tasks",
          },
        ],
        nextPageToken: undefined,
      },
    });
    colorsGet.mockResolvedValue({
      data: {
        calendar: {
          "14": {
            background: "#9fe1e7",
            foreground: "#1d1d1d",
          },
        },
        event: {
          "11": {
            background: "#d50000",
            foreground: "#ffffff",
          },
        },
      },
    });
  });

  it("reads blocker events with explicit Google event colors", async () => {
    eventsList.mockResolvedValue({
      data: {
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
      },
    });

    const records = await syncGoogleCalendarWindow(connection, {
      timeMin: "2026-04-06T00:00:00.000Z",
      timeMax: "2026-04-07T00:00:00.000Z",
    });

    expect(eventsList).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        timeMin: "2026-04-06T00:00:00.000Z",
        timeMax: "2026-04-07T00:00:00.000Z",
      }),
    );
    expect(records).toEqual([
      expect.objectContaining({
        externalEventId: "evt-1",
        title: "Investor breakfast",
        backgroundColor: "#d50000",
        foregroundColor: "#ffffff",
      }),
    ]);
  });

  it("falls back to the synced calendar color when an event has no explicit color", async () => {
    eventsList.mockResolvedValue({
      data: {
        items: [
          {
            id: "evt-1",
            summary: "Investor breakfast",
            start: { dateTime: "2026-04-06T15:00:00.000Z" },
            end: { dateTime: "2026-04-06T16:00:00.000Z" },
            updated: "2026-04-06T07:30:00.000Z",
          },
        ],
      },
    });

    const records = await syncGoogleCalendarWindow(connection, {
      timeMin: "2026-04-06T00:00:00.000Z",
      timeMax: "2026-04-07T00:00:00.000Z",
    });

    expect(records).toEqual([
      expect.objectContaining({
        backgroundColor: "#9fe1e7",
        foregroundColor: "#1d1d1d",
      }),
    ]);
  });

  it("returns null colors when neither event nor calendar colors can be resolved", async () => {
    calendarListList.mockResolvedValue({
      data: {
        items: [{ id: "allowed@example.com", summary: "Primary", primary: true }],
        nextPageToken: undefined,
      },
    });
    colorsGet.mockResolvedValue({ data: { calendar: {}, event: {} } });
    eventsList.mockResolvedValue({
      data: {
        items: [
          {
            id: "evt-1",
            summary: "Investor breakfast",
            start: { dateTime: "2026-04-06T15:00:00.000Z" },
            end: { dateTime: "2026-04-06T16:00:00.000Z" },
            updated: "2026-04-06T07:30:00.000Z",
          },
        ],
      },
    });

    const records = await syncGoogleCalendarWindow(connection, {
      timeMin: "2026-04-06T00:00:00.000Z",
      timeMax: "2026-04-07T00:00:00.000Z",
    });

    expect(records).toEqual([
      expect.objectContaining({
        backgroundColor: null,
        foregroundColor: null,
      }),
    ]);
  });

  it("creates planner-managed schedule blocks in the Free Time Tasks calendar with free status", async () => {
    eventsInsert.mockResolvedValue({ data: { id: "google-event-123" } });

    const googleEventId = await upsertGoogleScheduleBlock({ connection, task, block });

    expect(calendarListList).toHaveBeenCalled();
    expect(eventsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "free-time-tasks-id@group.calendar.google.com",
        requestBody: expect.objectContaining({
          transparency: "transparent",
        }),
      }),
    );
    expect(googleEventId).toBe("google-event-123");
  });

  it("falls back to the synced calendar when deleting an older event outside the planner calendar", async () => {
    eventsDelete
      .mockRejectedValueOnce({ code: 404 })
      .mockResolvedValueOnce({ data: {} });

    await deleteGoogleScheduleBlock(connection, "google-event-123");

    expect(eventsDelete).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        calendarId: "free-time-tasks-id@group.calendar.google.com",
        eventId: "google-event-123",
      }),
    );
    expect(eventsDelete).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        calendarId: "primary",
        eventId: "google-event-123",
      }),
    );
  });
});
