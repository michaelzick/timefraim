import { describe, expect, it } from "vitest";
import { getTimelinePlacement, getTimelineResizePreview, SLOT_HEIGHT } from "./timeline-geometry";

describe("timeline geometry", () => {
  it("clamps events that begin before the visible window", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T04:30:00", "2026-04-06T05:30:00")).toEqual({
      top: 0,
      height: 2 * SLOT_HEIGHT,
    });
  });

  it("clamps events that extend past midnight", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T23:00:00", "2026-04-07T01:00:00")).toEqual({
      top: 72 * SLOT_HEIGHT,
      height: 4 * SLOT_HEIGHT,
    });
  });

  it("skips events that fall completely outside the visible window", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T01:00:00", "2026-04-06T04:45:00")).toBeNull();
  });

  it("returns placement for normal in-range events", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T09:00:00", "2026-04-06T10:30:00")).toEqual({
      top: 16 * SLOT_HEIGHT,
      height: 6 * SLOT_HEIGHT,
    });
  });

  it("supports quarter-hour placement increments", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T09:15:00", "2026-04-06T09:30:00")).toEqual({
      top: 17 * SLOT_HEIGHT,
      height: SLOT_HEIGHT,
    });
  });

  it("shortens resize previews in quarter-hour increments", () => {
    expect(
      getTimelineResizePreview({
        date: "2026-04-06",
        startAt: "2026-04-06T09:00:00",
        endAt: "2026-04-06T09:45:00",
        deltaY: -SLOT_HEIGHT,
      }).durationMinutes,
    ).toBe(30);
  });

  it("extends resize previews in quarter-hour increments", () => {
    expect(
      getTimelineResizePreview({
        date: "2026-04-06",
        startAt: "2026-04-06T09:00:00",
        endAt: "2026-04-06T09:45:00",
        deltaY: 2 * SLOT_HEIGHT,
      }).durationMinutes,
    ).toBe(75);
  });

  it("does not resize below one quarter-hour slot", () => {
    expect(
      getTimelineResizePreview({
        date: "2026-04-06",
        startAt: "2026-04-06T09:00:00",
        endAt: "2026-04-06T09:30:00",
        deltaY: -10 * SLOT_HEIGHT,
      }).durationMinutes,
    ).toBe(15);
  });

  it("clamps resize previews to the visible timeline end", () => {
    expect(
      getTimelineResizePreview({
        date: "2026-04-06",
        startAt: "2026-04-06T23:30:00",
        endAt: "2026-04-06T23:45:00",
        deltaY: 10 * SLOT_HEIGHT,
      }).durationMinutes,
    ).toBe(30);
  });
});
