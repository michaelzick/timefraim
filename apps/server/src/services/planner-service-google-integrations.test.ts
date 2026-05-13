import { beforeEach, describe, expect, it, vi } from "vitest";

const { listGoogleCalendars } = vi.hoisted(() => ({
  listGoogleCalendars: vi.fn(),
}));

vi.mock("../integration/google-calendar.js", () => ({
  listGoogleCalendars,
}));

import {
  getGoogleCalendarSettings,
  saveGoogleCalendarSettings,
  saveGoogleSession,
} from "./planner-service-google-integrations.js";

function createRepository(row: {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
}) {
  return {
    getIntegrationToken: vi.fn().mockResolvedValue(row),
    upsertIntegrationToken: vi.fn().mockResolvedValue(undefined),
  };
}

describe("planner-service-google-integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters stale saved sync calendars out of the returned settings", async () => {
    const repository = createRepository({
      access_token: "google-token",
      refresh_token: null,
      expires_at: null,
      metadata: {
        calendarId: "primary",
        plannerCalendarId: "planner",
        email: "allowed@example.com",
        syncCalendarIds: ["removed", "team"],
      },
    });

    listGoogleCalendars.mockResolvedValue([
      { id: "planner", name: "Planner", primary: false, backgroundColor: null },
      { id: "primary", name: "Personal", primary: true, backgroundColor: "#123456" },
      { id: "team", name: "Team", primary: false, backgroundColor: "#654321" },
    ]);

    await expect(
      getGoogleCalendarSettings(repository as never),
    ).resolves.toEqual({
      availableCalendars: [
        { id: "primary", name: "Personal", primary: true, backgroundColor: "#123456" },
        { id: "team", name: "Team", primary: false, backgroundColor: "#654321" },
      ],
      syncCalendarIds: ["team"],
      syncPlannerBlocksToCalendar: true,
      plannerSyncTarget: "calendar_event",
      plannerCalendarId: "planner",
    });
  });

  it("rejects sync calendar ids that are not present in the account calendar list", async () => {
    const repository = createRepository({
      access_token: "google-token",
      refresh_token: "refresh-token",
      expires_at: "2026-04-16T12:00:00.000Z",
      metadata: {
        calendarId: "primary",
        plannerCalendarId: "planner",
        email: "allowed@example.com",
      },
    });

    listGoogleCalendars.mockResolvedValue([
      { id: "planner", name: "Planner", primary: false, backgroundColor: null },
      { id: "primary", name: "Personal", primary: true, backgroundColor: "#123456" },
      { id: "team", name: "Team", primary: false, backgroundColor: "#654321" },
    ]);

    await expect(
      saveGoogleCalendarSettings(repository as never, {
        syncCalendarIds: ["team", "missing"],
        plannerSyncTarget: "calendar_event",
        syncPlannerBlocksToCalendar: true,
      }),
    ).rejects.toThrow("Selected Google calendars are invalid or no longer available");
    expect(repository.upsertIntegrationToken).not.toHaveBeenCalled();
  });

  it("saves whether planner blocks sync to Google Calendar", async () => {
    const repository = createRepository({
      access_token: "google-token",
      refresh_token: "refresh-token",
      expires_at: "2026-04-16T12:00:00.000Z",
      metadata: {
        calendarId: "primary",
        plannerCalendarId: "planner",
        email: "allowed@example.com",
      },
    });

    listGoogleCalendars.mockResolvedValue([
      { id: "planner", name: "Planner", primary: false, backgroundColor: null },
      { id: "primary", name: "Personal", primary: true, backgroundColor: "#123456" },
      { id: "team", name: "Team", primary: false, backgroundColor: "#654321" },
    ]);

    await saveGoogleCalendarSettings(repository as never, {
      syncCalendarIds: ["team"],
      plannerSyncTarget: "none",
      syncPlannerBlocksToCalendar: false,
    });

    expect(repository.upsertIntegrationToken).toHaveBeenCalledWith(
      "google",
      expect.objectContaining({
        metadata: expect.objectContaining({
          syncCalendarIds: ["team"],
          plannerSyncTarget: "none",
          syncPlannerBlocksToCalendar: false,
        }),
      }),
      expect.anything(),
    );
  });

  it("saves Google Tasks as the planner block sync target", async () => {
    const repository = createRepository({
      access_token: "google-token",
      refresh_token: "refresh-token",
      expires_at: "2026-04-16T12:00:00.000Z",
      metadata: {
        calendarId: "primary",
        plannerCalendarId: "planner",
        email: "allowed@example.com",
      },
    });

    listGoogleCalendars.mockResolvedValue([
      { id: "planner", name: "Planner", primary: false, backgroundColor: null },
      { id: "primary", name: "Personal", primary: true, backgroundColor: "#123456" },
      { id: "team", name: "Team", primary: false, backgroundColor: "#654321" },
    ]);

    await saveGoogleCalendarSettings(repository as never, {
      syncCalendarIds: ["team"],
      plannerSyncTarget: "task",
      syncPlannerBlocksToCalendar: false,
    });

    expect(repository.upsertIntegrationToken).toHaveBeenCalledWith(
      "google",
      expect.objectContaining({
        metadata: expect.objectContaining({
          plannerSyncTarget: "task",
          syncPlannerBlocksToCalendar: false,
        }),
      }),
      expect.anything(),
    );
  });

  it("preserves planner block sync preference when refreshing the Google session", async () => {
    const repository = createRepository({
      access_token: "old-google-token",
      refresh_token: "old-refresh-token",
      expires_at: null,
      metadata: {
        calendarId: "primary",
        plannerCalendarId: "planner",
        email: "allowed@example.com",
        syncCalendarIds: ["team"],
        plannerSyncTarget: "task",
        syncPlannerBlocksToCalendar: false,
      },
    });

    await saveGoogleSession(repository as never, {
      accessToken: "new-google-token",
      refreshToken: "new-refresh-token",
      expiresAt: "2026-04-16T12:00:00.000Z",
      email: "allowed@example.com",
      calendarId: "primary",
    });

    expect(repository.upsertIntegrationToken).toHaveBeenCalledWith(
      "google",
      expect.objectContaining({
        metadata: expect.objectContaining({
          syncCalendarIds: ["team"],
          plannerSyncTarget: "task",
          syncPlannerBlocksToCalendar: false,
        }),
      }),
      expect.anything(),
    );
  });
});
