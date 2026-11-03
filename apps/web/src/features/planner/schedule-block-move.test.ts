import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import {
  buildScheduleBlockMove,
  findScheduleBlockMoveConflict,
  formatLocalTimeInput,
  formatMoveDate,
  runScheduleBlockMove,
} from "@/features/planner/schedule-block-move";
import { getTimezoneOffsetForDate } from "@/lib/utils";
import { buildTask } from "@/test/fixtures";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function localIso(value: string) {
  return new Date(value).toISOString();
}

describe("buildScheduleBlockMove across daylight saving", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it("keeps the local start time and duration when the UTC offset changes", () => {
    // US clocks go back on 2026-11-01, so 9:00 AM is 16:00Z before and 17:00Z after.
    const move = buildScheduleBlockMove({
      startAt: "2026-10-30T16:00:00.000Z",
      endAt: "2026-10-30T16:45:00.000Z",
      targetDate: "2026-11-05",
    });

    expect(move).toEqual({
      startAt: "2026-11-05T17:00:00.000Z",
      endAt: "2026-11-05T17:45:00.000Z",
      plannerDate: "2026-11-05",
      tzOffsetMinutes: 480,
    });
  });

  it("takes the offset from the target date rather than the original date", () => {
    const move = buildScheduleBlockMove({
      startAt: "2026-11-05T17:00:00.000Z",
      endAt: "2026-11-05T18:00:00.000Z",
      targetDate: "2026-10-30",
    });

    expect(move.tzOffsetMinutes).toBe(420);
    expect(move.startAt).toBe("2026-10-30T16:00:00.000Z");
  });
});

describe("buildScheduleBlockMove", () => {
  it("uses an explicit start time and keeps the duration", () => {
    const move = buildScheduleBlockMove({
      startAt: localIso("2026-04-06T09:00:00"),
      endAt: localIso("2026-04-06T10:30:00"),
      targetDate: "2026-04-08",
      startTime: "14:15",
    });

    expect(move.startAt).toBe(localIso("2026-04-08T14:15:00"));
    expect(move.endAt).toBe(localIso("2026-04-08T15:45:00"));
    expect(move.tzOffsetMinutes).toBe(getTimezoneOffsetForDate("2026-04-08"));
  });
});

describe("formatLocalTimeInput", () => {
  it("formats a local time for a time input", () => {
    expect(formatLocalTimeInput(localIso("2026-04-06T09:05:00"))).toBe("09:05");
  });
});

describe("findScheduleBlockMoveConflict", () => {
  const occupied = buildTask({
    id: "occupied",
    title: "Review roadmap",
    scheduledBlockId: "block-occupied",
    scheduledStartAt: localIso("2026-04-08T09:00:00"),
    scheduledEndAt: localIso("2026-04-08T10:00:00"),
  });

  it.each([
    ["overlaps the start", "08:30", "09:30", "Review roadmap"],
    ["overlaps the end", "09:30", "10:30", "Review roadmap"],
    ["sits inside", "09:15", "09:45", "Review roadmap"],
    ["ends where the other starts", "08:00", "09:00", null],
    ["starts where the other ends", "10:00", "11:00", null],
  ])("when the move %s", (_label, start, end, expectedTitle) => {
    const conflict = findScheduleBlockMoveConflict(
      [occupied],
      { startAt: localIso(`2026-04-08T${start}:00`), endAt: localIso(`2026-04-08T${end}:00`) },
      "block-moving",
    );

    expect(conflict?.title ?? null).toBe(expectedTitle);
  });

  it("ignores the block being moved", () => {
    const conflict = findScheduleBlockMoveConflict(
      [occupied],
      { startAt: localIso("2026-04-08T09:30:00"), endAt: localIso("2026-04-08T09:45:00") },
      "block-occupied",
    );

    expect(conflict).toBeNull();
  });

  it("ignores tasks that aren't scheduled", () => {
    const conflict = findScheduleBlockMoveConflict(
      [buildTask({ scheduledBlockId: null })],
      { startAt: localIso("2026-04-08T09:30:00"), endAt: localIso("2026-04-08T09:45:00") },
      "block-moving",
    );

    expect(conflict).toBeNull();
  });
});

describe("runScheduleBlockMove", () => {
  const block = {
    id: "block-moving",
    startAt: localIso("2026-04-06T09:00:00"),
    endAt: localIso("2026-04-06T10:00:00"),
  };

  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
  });

  it("sends the move and confirms it with a toast", async () => {
    const onUpdateScheduleBlock = vi.fn().mockResolvedValue(undefined);

    const result = await runScheduleBlockMove({
      block,
      targetDate: "2026-04-08",
      tasks: [],
      onUpdateScheduleBlock,
    });

    expect(result).toBe("moved");
    expect(onUpdateScheduleBlock).toHaveBeenCalledWith("block-moving", {
      startAt: localIso("2026-04-08T09:00:00"),
      endAt: localIso("2026-04-08T10:00:00"),
      plannerDate: "2026-04-08",
      tzOffsetMinutes: getTimezoneOffsetForDate("2026-04-08"),
    });
    expect(toast.success).toHaveBeenCalledWith(
      `Moved to ${formatMoveDate("2026-04-08")}`,
      expect.objectContaining({ action: expect.objectContaining({ label: "Undo" }) }),
    );
  });

  it("restores the original times and date on undo", async () => {
    const onUpdateScheduleBlock = vi.fn().mockResolvedValue(undefined);

    await runScheduleBlockMove({ block, targetDate: "2026-04-08", tasks: [], onUpdateScheduleBlock });
    const options = vi.mocked(toast.success).mock.calls[0][1] as unknown as { action: { onClick: () => void } };
    options.action.onClick();

    expect(onUpdateScheduleBlock).toHaveBeenLastCalledWith("block-moving", {
      startAt: block.startAt,
      endAt: block.endAt,
      plannerDate: "2026-04-06",
      tzOffsetMinutes: getTimezoneOffsetForDate("2026-04-06"),
    });
  });

  it("offers View day alongside Undo when a handler is given", async () => {
    const onViewDay = vi.fn();

    await runScheduleBlockMove({
      block,
      targetDate: "2026-04-08",
      tasks: [],
      onUpdateScheduleBlock: vi.fn().mockResolvedValue(undefined),
      onViewDay,
    });
    const options = vi.mocked(toast.success).mock.calls[0][1] as unknown as {
      action: { label: string; onClick: () => void };
      cancel: { label: string };
    };
    options.action.onClick();

    expect(options.action.label).toBe("View day");
    expect(options.cancel.label).toBe("Undo");
    expect(onViewDay).toHaveBeenCalledWith("2026-04-08");
  });

  it("does nothing when the date and time are unchanged", async () => {
    const onUpdateScheduleBlock = vi.fn();

    const result = await runScheduleBlockMove({
      block,
      targetDate: "2026-04-06",
      startTime: "09:00",
      tasks: [],
      onUpdateScheduleBlock,
    });

    expect(result).toBe("unchanged");
    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("still moves when only the time changes on the same date", async () => {
    const onUpdateScheduleBlock = vi.fn().mockResolvedValue(undefined);

    const result = await runScheduleBlockMove({
      block,
      targetDate: "2026-04-06",
      startTime: "11:00",
      tasks: [],
      onUpdateScheduleBlock,
    });

    expect(result).toBe("moved");
    expect(onUpdateScheduleBlock).toHaveBeenCalledTimes(1);
  });

  it("rejects with the conflicting task's name and sends nothing", async () => {
    const onUpdateScheduleBlock = vi.fn();
    const occupied = buildTask({
      title: "Review roadmap",
      scheduledBlockId: "block-occupied",
      scheduledStartAt: localIso("2026-04-08T09:30:00"),
      scheduledEndAt: localIso("2026-04-08T10:30:00"),
    });

    await expect(
      runScheduleBlockMove({ block, targetDate: "2026-04-08", tasks: [occupied], onUpdateScheduleBlock }),
    ).rejects.toThrow("Schedule conflict with Review roadmap");
    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
  });
});
