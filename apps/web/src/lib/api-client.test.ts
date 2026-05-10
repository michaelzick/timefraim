import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, request, withQuery } from "@/lib/api-client";
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
        new Response(JSON.stringify({ date: "2026-04-16", tasks: [], scheduleBlocks: [], calendarEvents: [], drafts: [], auditLogs: [], activeTimer: null, integrationStatus: { googleConnected: false, googleEmail: null, googleCalendarId: "primary", togglConnected: false, togglWorkspaceId: null, togglWorkspaceName: null, togglDefaultProjectId: null, togglDefaultProjectName: null, togglHasSavedToken: false, togglApiTokenHint: null, mcpFullAccessConfigured: false, mcpReadOnlyConfigured: false, tunnelBaseUrl: null }, calendarSync: { status: "not_synced", syncedAt: null, hiddenEventCount: 0 } }), { status: 200 }),
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

  it("forwards abort signals to fetch", async () => {
    const controller = new AbortController();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await request("/api/auth/me", "session-token", { signal: controller.signal });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it("surfaces structured server errors as ApiRequestError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "conflict",
          message: "Task is already scheduled",
          requestId: "req-server",
        }),
        { status: 409 },
      ),
    );

    try {
      await request("/api/calendar/sync", "session-token");
      throw new Error("request should have failed");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      expect(error).toMatchObject({
        status: 409,
        code: "conflict",
        requestId: "req-server",
        message: "Task is already scheduled",
      });
    }
  });

  it("falls back to legacy server error messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Google sync failed" }), {
        status: 500,
        headers: { "x-request-id": "req-legacy" },
      }),
    );

    await expect(request("/api/calendar/sync", "session-token")).rejects.toMatchObject({
      status: 500,
      code: "internal_error",
      requestId: "req-legacy",
      message: "Google sync failed",
    });
  });

  it("falls back cleanly when an error response is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Service unavailable", {
        status: 503,
        headers: { "x-request-id": "req-text" },
      }),
    );

    await expect(request("/api/calendar/sync", "session-token")).rejects.toMatchObject({
      status: 503,
      code: "dependency_unavailable",
      requestId: "req-text",
      message: "Request failed with status 503",
    });
  });
});
