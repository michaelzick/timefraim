import type { CalendarEventView } from "@timefraim/shared";
import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { getTimelinePlacement, isShortBlock } from "@/components/timeline-geometry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";

const FALLBACK_TIMELINE_EVENT_BORDER = "#6374ad";

type CalendarEventLane = {
  laneIndex: number;
  laneCount: number;
};

type TimelineEventStyle = CSSProperties & {
  "--timeline-event-left": string;
  "--timeline-event-left-sm": string;
  "--timeline-event-width": string;
  "--timeline-event-width-sm": string;
};

function getLaneLeft(laneIndex: number, laneCount: number, insetPx: number) {
  const gutterPx = insetPx * 2;
  return `calc(${insetPx}px + ((100% - ${gutterPx}px) / ${laneCount}) * ${laneIndex})`;
}

function getLaneWidth(laneCount: number, insetPx: number) {
  return `calc((100% - ${insetPx * 2}px) / ${laneCount})`;
}

export function TimelineBoardCalendarEvent({
  date,
  event,
  lane,
  isSelected,
  onSelectCalendarEvent,
  onDismissCalendarEvent,
}: {
  date: string;
  event: CalendarEventView;
  lane: CalendarEventLane;
  isSelected: boolean;
  onSelectCalendarEvent: (calendarEventId: string) => void;
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
}) {
  const placement = getTimelinePlacement(date, event.startAt, event.endAt);
  if (!placement) {
    return null;
  }

  const isShort = isShortBlock(event.startAt, event.endAt);
  const isVeryShort =
    new Date(event.endAt).getTime() - new Date(event.startAt).getTime() <
    30 * 60 * 1000;
  const laneCount = Math.max(1, lane.laneCount);
  const laneIndex = Math.min(laneCount - 1, Math.max(0, lane.laneIndex));
  const isSharedLane = laneCount > 1;

  const titleColor = "var(--calendar-event-title)";
  const borderColorSource = event.backgroundColor ?? FALLBACK_TIMELINE_EVENT_BORDER;
  const cardStyle: TimelineEventStyle = {
    "--timeline-event-left": getLaneLeft(laneIndex, laneCount, 8),
    "--timeline-event-left-sm": getLaneLeft(laneIndex, laneCount, 12),
    "--timeline-event-width": getLaneWidth(laneCount, 8),
    "--timeline-event-width-sm": getLaneWidth(laneCount, 12),
    top: placement.top,
    height: placement.height,
    backgroundColor: "transparent",
    borderColor: isSelected ? "var(--timeline-selection-ring)" : borderColorSource,
    borderWidth: "3px",
    color: titleColor,
  };
  const badgeStyle = {
    color: titleColor,
    borderColor: borderColorSource,
    backgroundColor: "transparent",
  };
  const sourceCalendarName = event.sourceCalendarName ?? "Google Calendar";

  return (
    <div
      key={event.id}
      data-planner-selectable="true"
      className={cn(
        "absolute left-[var(--timeline-event-left)] w-[var(--timeline-event-width)] cursor-pointer overflow-hidden rounded-[24px] border text-sm sm:left-[var(--timeline-event-left-sm)] sm:w-[var(--timeline-event-width-sm)]",
        isSharedLane ? "px-2 sm:px-3" : "px-3 sm:px-4",
        isShort ? "py-0" : "py-3 sm:py-4",
      )}
      style={cardStyle}
      onClick={() => onSelectCalendarEvent(event.id)}
    >
      <div
        className={cn(
          "flex min-w-0",
          isSharedLane
            ? isShort
              ? "h-full flex-row items-center justify-between gap-1.5"
              : "flex-col gap-1.5"
            : isShort
              ? "h-full flex-row items-center justify-between gap-2"
              : "flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3",
        )}
      >
        <div className="min-w-0 sm:flex-1">
          {isShort ? (
            <p className="truncate font-medium">
              {event.title}
              <span className="ml-2 text-xs font-normal text-[var(--calendar-event-meta)]">
                {formatTime(event.startAt)} to {formatTime(event.endAt)}
              </span>
            </p>
          ) : (
            <>
              <p className="truncate font-medium">{event.title}</p>
              <p className="mt-1 text-xs text-[var(--calendar-event-meta)]">
                {formatTime(event.startAt)} to {formatTime(event.endAt)}
              </p>
            </>
          )}
        </div>
        <div className={cn("flex min-w-0 items-center gap-2 sm:shrink-0", isSharedLane && "w-full justify-between")}>
          {!isVeryShort && (
            <Badge className="min-w-0 flex-1 normal-case tracking-[0.08em] sm:flex-none" style={badgeStyle}>
              <span className="min-w-0 truncate" style={{ color: titleColor }} title={sourceCalendarName}>
                {sourceCalendarName}
              </span>
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2"
            style={{ color: titleColor }}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onDismissCalendarEvent(event.id, event.title);
            }}
          >
            <X className="h-4 w-4" />
            {!isVeryShort && "Hide"}
          </Button>
        </div>
      </div>
    </div>
  );
}
