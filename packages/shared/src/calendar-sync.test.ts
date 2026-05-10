import { describe, expect, it } from "vitest";
import { calendarSyncResultSchema } from "./api.js";
import { dayPlanSchema } from "./day-plan.js";

const baseCalendarSync = {
  status: "not_synced" as const,
  syncedAt: null,
  hiddenEventCount: 0,
};

describe("calendar sync schemas", () => {
  it.each(["not_synced", "fully_synced", "partially_synced"] as const)(
    "parses %s calendar sync status on sync results",
    (status) => {
      const parsed = calendarSyncResultSchema.parse({
        date: "2026-04-06",
        events: [],
        calendarSync: {
          status,
          syncedAt: status === "not_synced" ? null : "2026-04-06T09:00:00.000Z",
          hiddenEventCount: status === "partially_synced" ? 1 : 0,
        },
      });

      expect(parsed.calendarSync.status).toBe(status);
    },
  );

  it("requires calendar sync status on day plans", () => {
    const parsed = dayPlanSchema.parse({
      date: "2026-04-06",
      tasks: [],
      scheduleBlocks: [],
      calendarEvents: [],
      drafts: [],
      auditLogs: [],
      activeTimer: null,
      integrationStatus: {
        googleConnected: false,
        googleEmail: null,
        googleCalendarId: "primary",
        togglConnected: false,
        togglWorkspaceId: null,
        togglWorkspaceName: null,
        togglDefaultProjectId: null,
        togglDefaultProjectName: null,
        togglHasSavedToken: false,
        togglApiTokenHint: null,
        mcpFullAccessConfigured: false,
        mcpReadOnlyConfigured: false,
        tunnelBaseUrl: null,
      },
      calendarSync: baseCalendarSync,
    });

    expect(parsed.calendarSync).toEqual(baseCalendarSync);
  });
});
