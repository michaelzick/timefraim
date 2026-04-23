import type { CalendarEventView } from "@timefraim/shared";
import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { getTimelinePlacement, isShortBlock } from "@/components/timeline-geometry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";

const FALLBACK_TIMELINE_EVENT_BORDER = "#6374ad";

export function TimelineBoardCalendarEvent({
  date,
  event,
  isSelected,
  onSelectCalendarEvent,
  onDismissCalendarEvent,
}: {
  date: string;
  event: CalendarEventView;
  isSelected: boolean;
  onSelectCalendarEvent: (calendarEventId: string) => void;
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
}) {
  const placement = getTimelinePlacement(date, event.startAt, event.endAt);
  if (!placement) {
    return null;
  }

  const titleColor = "var(--calendar-event-title)";
  const borderColorSource = event.backgroundColor ?? FALLBACK_TIMELINE_EVENT_BORDER;
  const cardStyle: CSSProperties = {
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

  return (
    <div
      key={event.id}
      className={cn("absolute left-3 right-3 cursor-pointer rounded-[24px] border p-4 text-sm")}
      style={cardStyle}
      onClick={() => onSelectCalendarEvent(event.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {isShortBlock(event.startAt, event.endAt) ? (
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
        <div className="flex shrink-0 items-center gap-2">
          <Badge className="normal-case tracking-[0.08em]" style={badgeStyle}>
            {event.sourceCalendarName ?? "Google Calendar"}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            style={{ color: titleColor }}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onDismissCalendarEvent(event.id, event.title);
            }}
          >
            <X className="h-4 w-4" />
            Hide
          </Button>
        </div>
      </div>
    </div>
  );
}
