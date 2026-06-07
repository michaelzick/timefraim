import { useDroppable } from "@dnd-kit/core";
import type { CalendarEventView, ScheduleBlock, Task, TimerSession } from "@timefraim/shared";
import {
  buildTimelineSlots,
  getTimelineContainerHeight,
  getTimelinePlacement,
  SLOT_HEIGHT,
} from "@/components/timeline-geometry";
import { TimelineBoardCalendarEvent } from "@/components/timeline-board-calendar-event";
import { TimelineNowHairline } from "@/components/timeline-now-hairline";
import {
  TimelineScheduleBlock,
  type TimelineBlockRunState,
} from "@/components/timeline-schedule-block";
import { cn } from "@/lib/utils";

function TimelineSlot({
  slot,
  label,
}: {
  slot: { id: string; iso: string; top: number };
  label: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    data: { slotIso: slot.iso },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute inset-x-0 border-t border-[var(--timeline-grid)]",
        isOver && "bg-[rgba(255,111,59,0.08)]",
      )}
      style={{ top: slot.top, height: SLOT_HEIGHT }}
    >
      {label ? (
        <span className="absolute -left-[44px] top-1 text-xs font-medium text-[var(--muted)] sm:-left-[74px]">{label}</span>
      ) : null}
    </div>
  );
}

function deriveRunState(block: ScheduleBlock, task: Task | undefined, activeTimer: TimerSession | null): TimelineBlockRunState {
  if (task?.status === "done") return "done";
  if (activeTimer?.taskId && activeTimer.taskId === block.taskId) return "running";
  return "idle";
}

type CalendarEventLane = {
  laneIndex: number;
  laneCount: number;
};

type PositionedCalendarEvent = {
  event: CalendarEventView;
  top: number;
  bottom: number;
  order: number;
};

const DEFAULT_CALENDAR_EVENT_LANE: CalendarEventLane = {
  laneIndex: 0,
  laneCount: 1,
};

function assignCalendarEventLanes(cluster: PositionedCalendarEvent[], lanes: Map<string, CalendarEventLane>) {
  const laneEnds: number[] = [];
  const laneIndexes = new Map<string, number>();

  for (const item of cluster) {
    const reusableLaneIndex = laneEnds.findIndex((bottom) => bottom <= item.top);
    const laneIndex = reusableLaneIndex === -1 ? laneEnds.length : reusableLaneIndex;

    laneEnds[laneIndex] = item.bottom;
    laneIndexes.set(item.event.id, laneIndex);
  }

  const laneCount = Math.max(1, laneEnds.length);
  for (const item of cluster) {
    lanes.set(item.event.id, {
      laneIndex: laneIndexes.get(item.event.id) ?? 0,
      laneCount,
    });
  }
}

function getCalendarEventLanes(date: string, calendarEvents: CalendarEventView[]) {
  const positionedEvents: PositionedCalendarEvent[] = calendarEvents.flatMap((event, order) => {
    const placement = getTimelinePlacement(date, event.startAt, event.endAt);
    return placement
      ? [{ event, order, top: placement.top, bottom: placement.top + placement.height }]
      : [];
  });
  const lanes = new Map<string, CalendarEventLane>();
  let cluster: PositionedCalendarEvent[] = [];
  let clusterBottom = -Infinity;

  positionedEvents.sort((left, right) => left.top - right.top || left.bottom - right.bottom || left.order - right.order);

  for (const item of positionedEvents) {
    if (cluster.length === 0 || item.top < clusterBottom) {
      cluster.push(item);
      clusterBottom = Math.max(clusterBottom, item.bottom);
      continue;
    }

    assignCalendarEventLanes(cluster, lanes);
    cluster = [item];
    clusterBottom = item.bottom;
  }

  assignCalendarEventLanes(cluster, lanes);
  return lanes;
}

export function TimelineBoard({
  date,
  tasks,
  scheduleBlocks,
  calendarEvents,
  activeTimer,
  selectedTaskId,
  selectedCalendarEventId,
  copyDragScheduleBlockId = null,
  onDismissCalendarEvent,
  onSelectTask,
  onSelectCalendarEvent,
  onDeleteScheduleBlock,
  onDuplicateTask,
  onStartTaskTimer,
  onMarkTaskDone,
  onResizeTaskDuration,
}: {
  date: string;
  tasks: Task[];
  scheduleBlocks: ScheduleBlock[];
  calendarEvents: CalendarEventView[];
  activeTimer: TimerSession | null;
  selectedTaskId: string | null;
  selectedCalendarEventId: string | null;
  copyDragScheduleBlockId?: string | null;
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
  onSelectTask: (taskId: string) => void;
  onSelectCalendarEvent: (calendarEventId: string) => void;
  onDeleteScheduleBlock: (scheduleBlockId: string, title: string) => void;
  onDuplicateTask?: (task: Task) => void;
  onStartTaskTimer?: (taskId: string) => void;
  onMarkTaskDone?: (task: Task) => void;
  onResizeTaskDuration?: (task: Task, durationMinutes: number) => void;
}) {
  const containerHeight = getTimelineContainerHeight();
  const slots = buildTimelineSlots(date);
  const calendarEventLanes = getCalendarEventLanes(date, calendarEvents);

  return (
    <div className="relative rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] pl-12 pr-3 sm:pl-20 sm:pr-4">
      <div className="relative" style={{ height: containerHeight }}>
        {slots.map((slot) => (
          <TimelineSlot key={slot.id} slot={slot} label={slot.label} />
        ))}

        {calendarEvents.map((event) => (
          <TimelineBoardCalendarEvent
            key={event.id}
            date={date}
            event={event}
            lane={calendarEventLanes.get(event.id) ?? DEFAULT_CALENDAR_EVENT_LANE}
            isSelected={selectedCalendarEventId === event.id}
            onSelectCalendarEvent={onSelectCalendarEvent}
            onDismissCalendarEvent={onDismissCalendarEvent}
          />
        ))}

        {scheduleBlocks.map((block) => {
          const task = tasks.find((item) => item.id === block.taskId);
          return (
            <TimelineScheduleBlock
              key={block.id}
              block={block}
              date={date}
              task={task}
              isSelected={selectedTaskId === block.taskId}
              isCopyDragSource={copyDragScheduleBlockId === block.id}
              runState={deriveRunState(block, task, activeTimer)}
              runningStartedAt={activeTimer?.startedAt ?? null}
              onDeleteScheduleBlock={onDeleteScheduleBlock}
              onDuplicateTask={onDuplicateTask}
              onStartTaskTimer={onStartTaskTimer}
              onMarkTaskDone={onMarkTaskDone}
              onResizeTaskDuration={onResizeTaskDuration}
              onSelectTask={onSelectTask}
            />
          );
        })}

        <TimelineNowHairline date={date} />
      </div>
    </div>
  );
}
