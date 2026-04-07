import { describe, expect, it } from "vitest";
import { getTimelinePlacement, SLOT_HEIGHT } from "./timeline-geometry";

describe("timeline geometry", () => {
  it("clamps events that begin before the visible window", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T04:30:00", "2026-04-06T05:30:00")).toEqual({
      top: 0,
      height: SLOT_HEIGHT,
    });
  });

  it("clamps events that extend past midnight", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T23:00:00", "2026-04-07T01:00:00")).toEqual({
      top: 36 * SLOT_HEIGHT,
      height: 2 * SLOT_HEIGHT,
    });
  });

  it("skips events that fall completely outside the visible window", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T01:00:00", "2026-04-06T04:45:00")).toBeNull();
  });

  it("returns placement for normal in-range events", () => {
    expect(getTimelinePlacement("2026-04-06", "2026-04-06T09:00:00", "2026-04-06T10:30:00")).toEqual({
      top: 8 * SLOT_HEIGHT,
      height: 3 * SLOT_HEIGHT,
    });
  });
});
