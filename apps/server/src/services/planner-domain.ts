import type {
  CalendarEventView,
  ScheduleBlock,
  Task,
  TimerSession,
  TaskStatus,
} from "@schejewel/shared";

export type Conflict = {
  id: string;
  kind: "schedule_block" | "calendar_event";
  title: string;
  startAt: string;
  endAt: string;
};

export function rangesOverlap(
  leftStartAt: string,
  leftEndAt: string,
  rightStartAt: string,
  rightEndAt: string,
): boolean {
  return new Date(leftStartAt) < new Date(rightEndAt) && new Date(rightStartAt) < new Date(leftEndAt);
}

export function detectScheduleConflicts(params: {
  candidateStartAt: string;
  candidateEndAt: string;
  scheduleBlocks: ScheduleBlock[];
  calendarEvents: CalendarEventView[];
  ignoreScheduleBlockId?: string;
}): Conflict[] {
  const scheduleBlockConflicts = params.scheduleBlocks
    .filter((block) => block.id !== params.ignoreScheduleBlockId)
    .filter((block) =>
      rangesOverlap(params.candidateStartAt, params.candidateEndAt, block.startAt, block.endAt),
    )
    .map((block) => ({
      id: block.id,
      kind: "schedule_block" as const,
      title: `Scheduled block ${block.id.slice(0, 8)}`,
      startAt: block.startAt,
      endAt: block.endAt,
    }));

  const calendarConflicts = params.calendarEvents
    .filter((event) => !event.isAppManaged)
    .filter((event) =>
      rangesOverlap(params.candidateStartAt, params.candidateEndAt, event.startAt, event.endAt),
    )
    .map((event) => ({
      id: event.id,
      kind: "calendar_event" as const,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
    }));

  return [...scheduleBlockConflicts, ...calendarConflicts];
}

export function buildGoogleEventPayload(task: Task, block: ScheduleBlock) {
  return {
    summary: task.title,
    description: task.notes ?? "",
    start: { dateTime: block.startAt },
    end: { dateTime: block.endAt },
    extendedProperties: {
      private: {
        origin: "schejewel",
        taskId: task.id,
        scheduleBlockId: block.id,
      },
    },
  };
}

export function finalizeTimerSession(activeTimer: TimerSession, endedAt: string): TimerSession {
  const durationSeconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(activeTimer.startedAt).getTime()) / 1000),
  );

  return {
    ...activeTimer,
    endedAt,
    durationSeconds,
  };
}

export function resolveIdleTaskStatus(task: Task): TaskStatus {
  if (task.status === "done" || task.status === "archived") {
    return task.status;
  }

  return task.scheduledBlockId ? "scheduled" : "planned";
}
