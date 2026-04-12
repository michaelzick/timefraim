import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
import {
  formatTaskPriority,
  getTaskPriorityBadgeClass,
  getTaskPriorityTimelineBlockClass,
} from "@/features/planner/task-presentation";
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
      {label ? <span className="absolute -left-[74px] top-1 text-xs font-medium text-[var(--muted)]">{label}</span> : null}
    </div>
  );
}

function TimelineScheduleBlock({
  block,
  date,
  task,
  onDeleteScheduleBlock,
  onSelectTask,
}: {
  block: ScheduleBlock;
  date: string;
  task: Task | undefined;
  onDeleteScheduleBlock: (scheduleBlockId: string, title: string) => void;
  onSelectTask: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: {
      dragType: "schedule-block",
      scheduleBlock: block,
      task,
    },
  });
  const placement = getTimelinePlacement(date, block.startAt, block.endAt);
  const priority = task?.priority ?? "medium";

  if (!placement) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        top: placement.top,
        height: placement.height,
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(
        "absolute left-8 right-8 z-10 cursor-pointer rounded-[24px] border p-4 transition",
        getTaskPriorityTimelineBlockClass(priority),
        isDragging && "opacity-75",
      )}
      onClick={() => onSelectTask(block.taskId)}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{task?.title ?? "Scheduled task"}</p>
          <p className="mt-1 text-xs text-[var(--muted-strong)]">
            {formatTime(block.startAt)} to {formatTime(block.endAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={getTaskPriorityBadgeClass(priority)}>{formatTaskPriority(priority)}</Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[var(--muted-strong)] hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteScheduleBlock(block.id, task?.title ?? "Scheduled task");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TimelineBoard({
  date,
  tasks,
  scheduleBlocks,
  calendarEvents,
  onDismissCalendarEvent,
  onSelectTask,
  onDeleteScheduleBlock,
}: {
  date: string;
  tasks: Task[];
  scheduleBlocks: ScheduleBlock[];
  calendarEvents: CalendarEventView[];
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
  onSelectTask: (taskId: string) => void;
  onDeleteScheduleBlock: (scheduleBlockId: string, title: string) => void;
}) {
  const containerHeight = getTimelineContainerHeight();
  const slots = buildTimelineSlots(date);

  return (
    <div className="relative rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.02)] pl-20 pr-4">
      <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
        <Badge>Drop a task onto the timeline</Badge>
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
              className="absolute left-3 right-3 rounded-[24px] border border-[rgba(99,116,173,0.35)] bg-[rgba(55,68,109,0.42)] p-4 text-sm text-[var(--muted-strong)] shadow-lg backdrop-blur"
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
                  <Badge className="normal-case tracking-[0.08em]">Google Calendar</Badge>
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
                </div>
              </div>
            </div>
          );
        })}

        {scheduleBlocks.map((block) => (
          <TimelineScheduleBlock
            key={block.id}
            block={block}
            date={date}
            task={tasks.find((item) => item.id === block.taskId)}
            onDeleteScheduleBlock={onDeleteScheduleBlock}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
}
