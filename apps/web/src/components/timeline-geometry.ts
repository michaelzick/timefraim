export const START_HOUR = 5;
export const END_HOUR_EXCLUSIVE = 24;
export const SLOT_HEIGHT = 28;
export const TIMELINE_INCREMENT_MINUTES = 15;

const QUARTER_HOUR_MS = TIMELINE_INCREMENT_MINUTES * 60 * 1000;

function getLocalDateTime(date: string, hour: number, minute: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setHours(hour, minute, 0, 0);
  return value;
}

export function getTimelineWindow(date: string) {
  return {
    startAt: getLocalDateTime(date, START_HOUR, 0),
    endAt: getLocalDateTime(date, END_HOUR_EXCLUSIVE, 0),
  };
}

export function getTimelineContainerHeight() {
  return ((END_HOUR_EXCLUSIVE - START_HOUR) * 4) * SLOT_HEIGHT;
}

function roundDeltaSlots(deltaY: number) {
  return Math.sign(deltaY) * Math.round(Math.abs(deltaY) / SLOT_HEIGHT);
}

export function getTimelineDurationMinutes(startAt: string, endAt: string) {
  const durationMs = new Date(endAt).getTime() - new Date(startAt).getTime();
  const slotCount = Math.max(1, Math.round(durationMs / QUARTER_HOUR_MS));
  return slotCount * TIMELINE_INCREMENT_MINUTES;
}

export function getTimelineResizePreview({
  date,
  startAt,
  endAt,
  deltaY,
}: {
  date: string;
  startAt: string;
  endAt: string;
  deltaY: number;
}) {
  const startMs = new Date(startAt).getTime();
  const currentSlotCount = Math.max(1, getTimelineDurationMinutes(startAt, endAt) / TIMELINE_INCREMENT_MINUTES);
  const windowEndMs = getTimelineWindow(date).endAt.getTime();
  const maxSlotCount = Math.max(1, Math.floor((windowEndMs - startMs) / QUARTER_HOUR_MS));
  const nextSlotCount = Math.min(
    maxSlotCount,
    Math.max(1, currentSlotCount + roundDeltaSlots(deltaY)),
  );

  return {
    durationMinutes: nextSlotCount * TIMELINE_INCREMENT_MINUTES,
    endAt: new Date(startMs + nextSlotCount * QUARTER_HOUR_MS).toISOString(),
  };
}

export function buildTimelineSlots(date: string) {
  const { startAt } = getTimelineWindow(date);
  const totalSlots = (END_HOUR_EXCLUSIVE - START_HOUR) * 4;

  return Array.from({ length: totalSlots }, (_, index) => {
    const slotDate = new Date(startAt.getTime() + index * QUARTER_HOUR_MS);
    const hour = slotDate.getHours();
    const minute = slotDate.getMinutes();
    const showLabel = minute === 0 || minute === 30;

    return {
      id: `slot-${slotDate.toISOString()}`,
      iso: slotDate.toISOString(),
      label: showLabel ? `${((hour + 11) % 12) + 1}:${String(minute).padStart(2, "0")}` : "",
      top: index * SLOT_HEIGHT,
    };
  });
}

export function isShortBlock(startAtIso: string, endAtIso: string) {
  return new Date(endAtIso).getTime() - new Date(startAtIso).getTime() < 60 * 60 * 1000;
}

export function getTimelinePlacement(date: string, startAt: string, endAt: string) {
  const window = getTimelineWindow(date);
  const itemStart = new Date(startAt);
  const itemEnd = new Date(endAt);

  const visibleStartMs = Math.max(itemStart.getTime(), window.startAt.getTime());
  const visibleEndMs = Math.min(itemEnd.getTime(), window.endAt.getTime());

  if (visibleEndMs <= visibleStartMs) {
    return null;
  }

  return {
    top: ((visibleStartMs - window.startAt.getTime()) / QUARTER_HOUR_MS) * SLOT_HEIGHT,
    height: Math.max(SLOT_HEIGHT, ((visibleEndMs - visibleStartMs) / QUARTER_HOUR_MS) * SLOT_HEIGHT),
  };
}
