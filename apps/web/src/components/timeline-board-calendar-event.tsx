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
  const sourceCalendarName = event.sourceCalendarName ?? "Google Calendar";

  return (
    <div
      key={event.id}
      className={cn(
        "absolute left-2 right-2 cursor-pointer overflow-hidden rounded-[24px] border p-3 text-sm sm:left-3 sm:right-3 sm:p-4",
      )}
      style={cardStyle}
      onClick={() => onSelectCalendarEvent(event.id)}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 sm:flex-1">
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
        <div className="flex min-w-0 items-center gap-2 sm:shrink-0">
          <Badge className="min-w-0 flex-1 normal-case tracking-[0.08em] sm:flex-none" style={badgeStyle}>
            <span className="min-w-0 truncate" style={{ color: titleColor }} title={sourceCalendarName}>
              {sourceCalendarName}
            </span>
          </Badge>
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
            Hide
          </Button>
        </div>
      </div>
    </div>
  );
}
