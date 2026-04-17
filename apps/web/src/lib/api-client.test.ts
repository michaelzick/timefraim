import { afterEach, describe, expect, it, vi } from "vitest";
import { request, withQuery } from "@/lib/api-client";
import { plannerApi } from "@/lib/api-planner";

describe("api-client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encodes query params safely", () => {
    expect(
      withQuery("/api/day-plan", {
        date: "2026-04-16",
        tz: -420,
        search: "focus & planning",
      }),
    ).toBe("/api/day-plan?date=2026-04-16&tz=-420&search=focus+%26+planning");
  });

  it("passes encoded planner query paths through fetch", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ date: "2026-04-16", tasks: [], scheduleBlocks: [], calendarEvents: [], drafts: [], auditLogs: [], activeTimer: null, integrationStatus: { googleConnected: false, googleEmail: null, googleCalendarId: "primary", togglConnected: false, togglWorkspaceId: null, togglWorkspaceName: null, togglDefaultProjectId: null, togglDefaultProjectName: null, togglHasSavedToken: false, togglApiTokenHint: null, mcpFullAccessConfigured: false, mcpReadOnlyConfigured: false, tunnelBaseUrl: null } }), { status: 200 }),
      );

    await plannerApi.getDayPlan("session-token", "2026-04-16", -420);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/day-plan?date=2026-04-16&tz=-420"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
  });

  it("surfaces structured server error messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Google sync failed" }), { status: 500 }),
    );

    await expect(request("/api/calendar/sync", "session-token")).rejects.toThrow(
      "Google sync failed",
    );
  });
});
