import { useEffect, useState } from "react";
import { END_HOUR_EXCLUSIVE, getTimelineWindow, SLOT_HEIGHT, START_HOUR } from "@/components/timeline-geometry";

const QUARTER_HOUR_MS = 15 * 60 * 1000;

function getNowOffset(date: string): number | null {
  const window = getTimelineWindow(date);
  const now = Date.now();
  if (now < window.startAt.getTime() || now >= window.endAt.getTime()) {
    return null;
  }
  return ((now - window.startAt.getTime()) / QUARTER_HOUR_MS) * SLOT_HEIGHT;
}

export function TimelineNowHairline({ date }: { date: string }) {
  const [offset, setOffset] = useState<number | null>(() => getNowOffset(date));

  useEffect(() => {
    setOffset(getNowOffset(date));
    const interval = window.setInterval(() => {
      setOffset(getNowOffset(date));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [date]);

  if (offset === null) return null;

  const containerHeight = (END_HOUR_EXCLUSIVE - START_HOUR) * 4 * SLOT_HEIGHT;
  if (offset > containerHeight) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top: offset }}
      data-testid="timeline-now-hairline"
    >
      <div className="absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--accent)]" />
      <div className="h-px w-full bg-[var(--accent)] opacity-80" />
    </div>
  );
}
