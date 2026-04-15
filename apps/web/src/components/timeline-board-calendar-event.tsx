import type { CalendarEventView } from "@timefraim/shared";
import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { getTimelinePlacement } from "@/components/timeline-geometry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";

const FALLBACK_TIMELINE_EVENT_BORDER = "#6374ad";

function getCalendarEventForegroundColor() {
  return "#ffffff";
}

export function TimelineBoardCalendarEvent({
  date,
  event,
  onDismissCalendarEvent,
}: {
  date: string;
  event: CalendarEventView;
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
}) {
  const placement = getTimelinePlacement(date, event.startAt, event.endAt);
  if (!placement) {
    return null;
  }

  const foregroundColor = getCalendarEventForegroundColor();
  const borderColorSource = event.backgroundColor ?? FALLBACK_TIMELINE_EVENT_BORDER;
  const cardStyle: CSSProperties = {
    top: placement.top,
    height: placement.height,
    backgroundColor: "transparent",
    borderColor: borderColorSource,
    borderWidth: "3px",
    color: foregroundColor,
  };
  const badgeStyle = {
    color: foregroundColor,
    borderColor: borderColorSource,
    backgroundColor: "transparent",
  };

  return (
    <div key={event.id} className="absolute left-3 right-3 rounded-[24px] border p-4 text-sm" style={cardStyle}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{event.title}</p>
          <p className="mt-1 text-xs opacity-80">
            {formatTime(event.startAt)} to {formatTime(event.endAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className="normal-case tracking-[0.08em]" style={badgeStyle}>
            Google Calendar
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 px-2", "hover:bg-white/10")}
            style={{ color: foregroundColor }}
            onClick={() => onDismissCalendarEvent(event.id, event.title)}
          >
            <X className="h-4 w-4" />
            Hide
          </Button>
        </div>
      </div>
    </div>
  );
}
