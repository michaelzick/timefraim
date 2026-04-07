import { useDroppable } from "@dnd-kit/core";
import type { CalendarEventView, ScheduleBlock, Task } from "@timefraim/shared";
import { X } from "lucide-react";
import {
  buildTimelineSlots,
  getTimelineContainerHeight,
  getTimelinePlacement,
  SLOT_HEIGHT,
} from "@/components/timeline-geometry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";

function TimelineSlot({
  slot,
  label,
}: {
  slot: { id: string; iso: string; top: number };
  label: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data: {
      slotIso: slot.iso,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute inset-x-0 border-t border-white/8",
        isOver && "bg-[rgba(255,111,59,0.08)]",
      )}
      style={{ top: slot.top, height: SLOT_HEIGHT }}
    >
      <span className="absolute -left-[74px] top-1 text-xs font-medium text-[var(--muted)]">{label}</span>
    </div>
  );
}

export function TimelineBoard({
  date,
  tasks,
  scheduleBlocks,
  calendarEvents,
  onDismissCalendarEvent,
}: {
  date: string;
  tasks: Task[];
  scheduleBlocks: ScheduleBlock[];
  calendarEvents: CalendarEventView[];
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
}) {
  const containerHeight = getTimelineContainerHeight();
  const slots = buildTimelineSlots(date);

  return (
    <div className="relative rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.02)] pl-20 pr-4">
      <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
        <Badge>Drop a task onto the day</Badge>
      </div>
      <div className="relative" style={{ height: containerHeight }}>
        {slots.map((slot) => (
          <TimelineSlot key={slot.id} slot={slot} label={slot.label} />
        ))}

        {calendarEvents.map((event) => {
          const placement = getTimelinePlacement(date, event.startAt, event.endAt);
          if (!placement) {
            return null;
          }

          return (
            <div
              key={event.id}
              className={cn(
                "absolute left-3 right-3 rounded-[24px] border p-4 text-sm shadow-lg backdrop-blur",
                event.isAppManaged
                  ? "border-[rgba(255,111,59,0.25)] bg-[rgba(255,111,59,0.14)] text-white"
                  : "border-[rgba(99,116,173,0.35)] bg-[rgba(55,68,109,0.42)] text-[var(--muted-strong)]",
              )}
              style={{ top: placement.top, height: placement.height }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {formatTime(event.startAt)} to {formatTime(event.endAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge>{event.isAppManaged ? "App" : "Blocker"}</Badge>
                  {!event.isAppManaged ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[var(--muted-strong)] hover:bg-white/10 hover:text-white"
                      onClick={() => onDismissCalendarEvent(event.id, event.title)}
                    >
                      <X className="h-4 w-4" />
                      Hide
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {scheduleBlocks.map((block) => {
          const task = tasks.find((item) => item.id === block.taskId);
          const placement = getTimelinePlacement(date, block.startAt, block.endAt);
          if (!placement) {
            return null;
          }

          return (
            <div
              key={block.id}
              className="absolute left-8 right-8 rounded-[24px] border border-[rgba(255,111,59,0.48)] bg-[linear-gradient(180deg,rgba(255,111,59,0.24),rgba(255,155,112,0.1))] p-4 shadow-[0_20px_50px_rgba(255,111,59,0.18)]"
              style={{ top: placement.top, height: placement.height }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{task?.title ?? "Scheduled task"}</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">
                    {formatTime(block.startAt)} to {formatTime(block.endAt)}
                  </p>
                </div>
                <Badge>{block.state.replace("_", " ")}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
