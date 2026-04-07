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
    expect(events).toEqual([
      {
        id: "event-row-1",
        externalEventId: "google-evt-1",
        title: "Investor breakfast",
        startAt: "2026-04-06T15:00:00.000Z",
        endAt: "2026-04-06T16:00:00.000Z",
        isAppManaged: false,
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
      scheduleBlockId: "block-1",
      rawPayload: { source: "timefraim" },
      externalUpdatedAt: null,
      dismissedExternalUpdatedAt: null,
      createdAt: "2026-04-06T08:00:00.000Z",
      updatedAt: "2026-04-06T08:00:00.000Z",
    });
  });
});
