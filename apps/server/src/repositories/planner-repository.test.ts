import { describe, expect, it, vi } from "vitest";
import { PlannerRepository } from "./planner-repository.js";

describe("planner-repository", () => {
  it("filters app-managed rows out of planner calendar ranges", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "event-row-1",
            external_event_id: "google-evt-1",
            title: "Investor breakfast",
            start_at: "2026-04-06T15:00:00.000Z",
            end_at: "2026-04-06T16:00:00.000Z",
            is_app_managed: false,
            background_color: "#dc2127",
            foreground_color: "#ffffff",
          },
        ],
      }),
    };
    const repository = new PlannerRepository();

    const events = await repository.listCalendarEventsForRange(
      {
        startAt: "2026-04-06T00:00:00.000Z",
        endAt: "2026-04-07T00:00:00.000Z",
      },
      db as never,
    );

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("and is_app_managed = false"),
      ["2026-04-06T00:00:00.000Z", "2026-04-07T00:00:00.000Z"],
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("external_updated_at is null"),
      ["2026-04-06T00:00:00.000Z", "2026-04-07T00:00:00.000Z"],
    );
    expect(events).toEqual([
      {
        id: "event-row-1",
        externalEventId: "google-evt-1",
        title: "Investor breakfast",
        startAt: "2026-04-06T15:00:00.000Z",
        endAt: "2026-04-06T16:00:00.000Z",
        isAppManaged: false,
        backgroundColor: "#dc2127",
        foregroundColor: "#ffffff",
        sourceCalendarId: null,
        sourceCalendarName: null,
        togglProjectId: null,
      },
    ]);
  });

  it("keeps direct lookups available for app-managed calendar rows", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "event-row-2",
            external_event_id: "google-evt-2",
            title: "Deep work",
            start_at: "2026-04-06T17:00:00.000Z",
            end_at: "2026-04-06T17:45:00.000Z",
            is_app_managed: true,
            background_color: null,
            foreground_color: null,
            schedule_block_id: "block-1",
            raw_payload: { source: "timefraim" },
            external_updated_at: null,
            dismissed_external_updated_at: null,
            created_at: "2026-04-06T08:00:00.000Z",
            updated_at: "2026-04-06T08:00:00.000Z",
          },
        ],
      }),
    };
    const repository = new PlannerRepository();

    const event = await repository.getCalendarEventByExternalEventId("google-evt-2", db as never);

    expect(event).toEqual({
      id: "event-row-2",
      externalEventId: "google-evt-2",
      title: "Deep work",
      startAt: "2026-04-06T17:00:00.000Z",
      endAt: "2026-04-06T17:45:00.000Z",
      isAppManaged: true,
      backgroundColor: null,
      foregroundColor: null,
      scheduleBlockId: "block-1",
      rawPayload: { source: "timefraim" },
      externalUpdatedAt: null,
      dismissedExternalUpdatedAt: null,
      sourceCalendarId: null,
      sourceCalendarName: null,
      togglProjectId: null,
      createdAt: "2026-04-06T08:00:00.000Z",
      updatedAt: "2026-04-06T08:00:00.000Z",
    });
  });

  it("marks dismissed calendar rows even when Google did not send an updated timestamp", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "event-row-3",
            external_event_id: "google-evt-3",
            title: "Lunch",
            start_at: "2026-04-06T18:00:00.000Z",
            end_at: "2026-04-06T18:30:00.000Z",
            is_app_managed: false,
            background_color: null,
            foreground_color: null,
            schedule_block_id: null,
            raw_payload: {},
            external_updated_at: null,
            dismissed_external_updated_at: "2026-04-06T08:00:00.000Z",
            created_at: "2026-04-06T08:00:00.000Z",
            updated_at: "2026-04-06T08:00:00.000Z",
          },
        ],
      }),
    };
    const repository = new PlannerRepository();

    const event = await repository.dismissCalendarEvent("event-row-3", db as never);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("coalesce(external_updated_at, updated_at)"),
      ["event-row-3"],
    );
    expect(event?.dismissedExternalUpdatedAt).toBe("2026-04-06T08:00:00.000Z");
  });

  it("stores Toggl catalogs as jsonb strings and maps the saved row", async () => {
    const availableWorkspaces = [{ id: "workspace-1", name: "Personal" }];
    const availableProjects = [{ id: "project-1", name: "Deep Work", workspaceId: "workspace-1", active: true }];
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            user_id: "user-1",
            api_token_ciphertext: "ciphertext",
            api_token_hint: "••••7890",
            workspace_id: "workspace-1",
            workspace_name: "Personal",
            default_project_id: "project-1",
            default_project_name: "Deep Work",
            available_workspaces: availableWorkspaces,
            available_projects: availableProjects,
            last_validated_at: "2026-04-15T12:00:00.000Z",
            created_at: "2026-04-15T12:00:00.000Z",
            updated_at: "2026-04-15T12:00:00.000Z",
          },
        ],
      }),
    };
    const repository = new PlannerRepository();

    const saved = await repository.upsertUserTogglConnection(
      "user-1",
      {
        apiTokenCiphertext: "ciphertext",
        apiTokenHint: "••••7890",
        workspaceId: "workspace-1",
        workspaceName: "Personal",
        defaultProjectId: "project-1",
        defaultProjectName: "Deep Work",
        availableWorkspaces,
        availableProjects,
        lastValidatedAt: "2026-04-15T12:00:00.000Z",
      },
      db as never,
    );

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)");
    expect(params[7]).toBe(JSON.stringify(availableWorkspaces));
    expect(params[8]).toBe(JSON.stringify(availableProjects));
    expect(saved).toEqual({
      userId: "user-1",
      apiTokenCiphertext: "ciphertext",
      apiTokenHint: "••••7890",
      workspaceId: "workspace-1",
      workspaceName: "Personal",
      defaultProjectId: "project-1",
      defaultProjectName: "Deep Work",
      availableWorkspaces,
      availableProjects,
      lastValidatedAt: "2026-04-15T12:00:00.000Z",
      createdAt: "2026-04-15T12:00:00.000Z",
      updatedAt: "2026-04-15T12:00:00.000Z",
    });
  });
});
