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
      saveGoogleCalendarSettings(repository as never, ["team", "missing"]),
    ).rejects.toThrow("Selected Google calendars are invalid or no longer available");
    expect(repository.upsertIntegrationToken).not.toHaveBeenCalled();
  });
});
