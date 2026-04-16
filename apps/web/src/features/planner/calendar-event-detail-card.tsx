import type { CalendarEventView } from "@timefraim/shared";
import { Play, Square } from "lucide-react";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatTime } from "@/lib/utils";

type CalendarEventDetailCardProps = {
  detailPanelRef: RefObject<HTMLDivElement | null>;
  event: CalendarEventView;
  activeTimerCalendarEventId: string | null;
  isMutating: boolean;
  onStartEventTimer: (calendarEventId: string) => void;
  onStopTimer: () => void;
};

export function CalendarEventDetailCard({
  detailPanelRef,
  event,
  activeTimerCalendarEventId,
  isMutating,
  onStartEventTimer,
  onStopTimer,
}: CalendarEventDetailCardProps) {
  const isTimerRunning = activeTimerCalendarEventId === event.id;

  return (
    <Card ref={detailPanelRef}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Focus</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Calendar event</h2>
        </div>
        <Badge
          className="normal-case tracking-[0.08em]"
          style={{
            borderColor: event.backgroundColor ?? "#6374ad",
            backgroundColor: "transparent",
            color: "#ffffff",
          }}
        >
          {event.sourceCalendarName ?? "Google Calendar"}
        </Badge>
      </div>
      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
          <p className="text-sm font-medium text-white">{event.title}</p>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            {formatTime(event.startAt)} to {formatTime(event.endAt)}
          </p>
        </div>
        <div>
          {isTimerRunning ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onStopTimer}
              disabled={isMutating}
            >
              <Square className="h-4 w-4" />
              Stop timer
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => onStartEventTimer(event.id)}
              disabled={isMutating}
            >
              <Play className="h-4 w-4" />
              Start timer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
