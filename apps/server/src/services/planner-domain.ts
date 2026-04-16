import type {
  CalendarEventView,
  ScheduleBlock,
  Task,
  TimerSession,
  TaskStatus,
} from "@timefraim/shared";

export type Conflict = {
  id: string;
  kind: "schedule_block" | "calendar_event";
  title: string;
  startAt: string;
  endAt: string;
};

function sameInstant(left: string | null, right: string | null) {
  if (left === null || right === null) {
    return left === right;
  }

  return new Date(left).getTime() === new Date(right).getTime();
}

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
    transparency: "transparent",
    extendedProperties: {
      private: {
        origin: "timefraim",
        taskId: task.id,
        scheduleBlockId: block.id,
      },
    },
  };
}

export function isCalendarEventDismissed(params: {
  externalUpdatedAt: string | null;
  dismissedExternalUpdatedAt: string | null;
}) {
  return params.dismissedExternalUpdatedAt !== null
    && sameInstant(params.externalUpdatedAt, params.dismissedExternalUpdatedAt);
}

export function resolveDismissedExternalUpdatedAt(params: {
  previousExternalUpdatedAt: string | null;
  previousDismissedExternalUpdatedAt: string | null;
  nextExternalUpdatedAt: string | null;
}) {
  if (params.previousDismissedExternalUpdatedAt === null) {
    return null;
  }

  return sameInstant(params.previousExternalUpdatedAt, params.nextExternalUpdatedAt)
    ? params.previousDismissedExternalUpdatedAt
    : null;
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
  if (task.status === "done") {
    return task.status;
  }

  return task.scheduledBlockId ? "scheduled" : "planned";
}
