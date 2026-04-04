import { useDroppable } from "@dnd-kit/core";
import type { CalendarEventView, ScheduleBlock, Task } from "@schejewel/shared";
import { Badge } from "@/components/ui/badge";
import { cn, formatTime } from "@/lib/utils";

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_HEIGHT = 56;

function minutesBetween(startAt: string, endAt: string) {
  return Math.max(0, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
}

function yOffset(dayStart: string, isoString: string) {
  return (minutesBetween(dayStart, isoString) / 30) * SLOT_HEIGHT;
}

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
}: {
  date: string;
  tasks: Task[];
  scheduleBlocks: ScheduleBlock[];
  calendarEvents: CalendarEventView[];
}) {
  const dayStart = `${date}T${String(START_HOUR).padStart(2, "0")}:00:00.000Z`;
  const totalSlots = (END_HOUR - START_HOUR) * 2;
  const containerHeight = totalSlots * SLOT_HEIGHT;

  const slots = Array.from({ length: totalSlots }, (_, index) => {
    const hour = START_HOUR + Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";
    const iso = `${date}T${String(hour).padStart(2, "0")}:${minute}:00.000Z`;
    const label = `${((hour + 11) % 12) + 1}:${minute}`;
    return {
      id: `slot-${iso}`,
      iso,
      label,
      top: index * SLOT_HEIGHT,
    };
  });

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
          const top = yOffset(dayStart, event.startAt);
          const height = Math.max(44, (minutesBetween(event.startAt, event.endAt) / 30) * SLOT_HEIGHT);
          return (
            <div
              key={event.id}
              className={cn(
                "absolute left-3 right-3 rounded-[24px] border p-4 text-sm shadow-lg backdrop-blur",
                event.isAppManaged
                  ? "border-[rgba(255,111,59,0.25)] bg-[rgba(255,111,59,0.14)] text-white"
                  : "border-[rgba(99,116,173,0.35)] bg-[rgba(55,68,109,0.42)] text-[var(--muted-strong)]",
              )}
              style={{ top, height }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {formatTime(event.startAt)} to {formatTime(event.endAt)}
                  </p>
                </div>
                <Badge className="shrink-0">
                  {event.isAppManaged ? "App" : "Blocker"}
                </Badge>
              </div>
            </div>
          );
        })}

        {scheduleBlocks.map((block) => {
          const task = tasks.find((item) => item.id === block.taskId);
          const top = yOffset(dayStart, block.startAt);
          const height = Math.max(44, (minutesBetween(block.startAt, block.endAt) / 30) * SLOT_HEIGHT);
          return (
            <div
              key={block.id}
              className="absolute left-8 right-8 rounded-[24px] border border-[rgba(255,111,59,0.48)] bg-[linear-gradient(180deg,rgba(255,111,59,0.24),rgba(255,155,112,0.1))] p-4 shadow-[0_20px_50px_rgba(255,111,59,0.18)]"
              style={{ top, height }}
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
