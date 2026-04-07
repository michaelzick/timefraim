export const START_HOUR = 5;
export const END_HOUR_EXCLUSIVE = 24;
export const SLOT_HEIGHT = 56;

const HALF_HOUR_MS = 30 * 60 * 1000;

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
  return ((END_HOUR_EXCLUSIVE - START_HOUR) * 2) * SLOT_HEIGHT;
}

export function buildTimelineSlots(date: string) {
  const { startAt } = getTimelineWindow(date);
  const totalSlots = (END_HOUR_EXCLUSIVE - START_HOUR) * 2;

  return Array.from({ length: totalSlots }, (_, index) => {
    const slotDate = new Date(startAt.getTime() + index * HALF_HOUR_MS);
    const hour = slotDate.getHours();
    const minute = slotDate.getMinutes();

    return {
      id: `slot-${slotDate.toISOString()}`,
      iso: slotDate.toISOString(),
      label: `${((hour + 11) % 12) + 1}:${String(minute).padStart(2, "0")}`,
      top: index * SLOT_HEIGHT,
    };
  });
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
    top: ((visibleStartMs - window.startAt.getTime()) / HALF_HOUR_MS) * SLOT_HEIGHT,
    height: Math.max(44, ((visibleEndMs - visibleStartMs) / HALF_HOUR_MS) * SLOT_HEIGHT),
  };
}
