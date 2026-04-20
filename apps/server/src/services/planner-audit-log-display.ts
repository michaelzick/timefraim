import type { AuditLog, CalendarEventView, ScheduleBlock, Task } from "@timefraim/shared";

type AuditLogDisplayContext = {
  calendarEvents: CalendarEventView[];
  scheduleBlocks: ScheduleBlock[];
  tasks: Task[];
};

type AuditLogLookupContext = {
  calendarEventsById: Map<string, CalendarEventView>;
  scheduleBlocksById: Map<string, ScheduleBlock>;
  tasksById: Map<string, Task>;
};

export function resolveAuditLogDisplaySummaries(
  auditLogs: AuditLog[],
  context: AuditLogDisplayContext,
) {
  const lookupContext: AuditLogLookupContext = {
    calendarEventsById: new Map(context.calendarEvents.map((event) => [event.id, event])),
    scheduleBlocksById: new Map(context.scheduleBlocks.map((block) => [block.id, block])),
    tasksById: new Map(context.tasks.map((task) => [task.id, task])),
  };

  return auditLogs.map((auditLog) => ({
    ...auditLog,
    displaySummary: resolveAuditLogDisplaySummary(auditLog, lookupContext),
  }));
}

function resolveAuditLogDisplaySummary(auditLog: AuditLog, context: AuditLogLookupContext) {
  switch (auditLog.action) {
    case "task.create":
      return withTitleOrDiff("Create task", getTaskTitle(auditLog, context), auditLog.diffSummary);
    case "task.update":
      return withTitleOrDiff("Update task", getTaskTitle(auditLog, context), auditLog.diffSummary);
    case "task.delete":
      return withTitleOrDiff("Delete task", getTaskTitle(auditLog, context), auditLog.diffSummary);
    case "task.duplicate":
      return withTitleOrDiff("Duplicate task", getTaskTitle(auditLog, context), auditLog.diffSummary);
    case "schedule_block.create":
      return withTitleOrDiff("Schedule task", getScheduleTaskTitle(auditLog, context), auditLog.diffSummary);
    case "schedule_block.update":
      return withTitleOrDiff("Move scheduled task", getScheduleTaskTitle(auditLog, context), auditLog.diffSummary);
    case "schedule_block.delete":
      return withTitleOrDiff("Remove scheduled task", getScheduleTaskTitle(auditLog, context), auditLog.diffSummary);
    case "schedule_block.duplicate":
      return withTitleOrDiff("Duplicate scheduled task", getScheduleTaskTitle(auditLog, context), auditLog.diffSummary);
    case "calendar_event.dismiss":
      return withTitleOrDiff("Hide calendar event", getCalendarEventTitle(auditLog, context), auditLog.diffSummary);
    case "calendar_event.update":
      return withTitleOrDiff("Update calendar event", getCalendarEventTitle(auditLog, context), auditLog.diffSummary);
    case "timer.start":
      return withTitleOrDiff("Start timer for task", getTaskTitle(auditLog, context), auditLog.diffSummary);
    case "timer.start_event":
      return withTitleOrDiff(
        "Start timer for calendar event",
        getCalendarEventTitle(auditLog, context),
        auditLog.diffSummary,
      );
    case "timer.stop":
      return "Stop active timer";
    default:
      return auditLog.diffSummary;
  }
}

function getTaskTitle(auditLog: AuditLog, context: AuditLogLookupContext) {
  return (
    getPayloadString(auditLog.payload.taskTitle)
    ?? getPayloadString(auditLog.payload.sourceTaskTitle)
    ?? getTaskTitleById(getPayloadString(auditLog.payload.taskId), context)
    ?? getTaskTitleById(getPayloadString(auditLog.payload.sourceTaskId), context)
    ?? (auditLog.entityType === "task" ? getTaskTitleById(auditLog.entityId, context) : null)
  );
}

function getScheduleTaskTitle(auditLog: AuditLog, context: AuditLogLookupContext) {
  return (
    getPayloadString(auditLog.payload.taskTitle)
    ?? getTaskTitleById(getPayloadString(auditLog.payload.taskId), context)
    ?? getTaskTitleByBlockId(getPayloadString(auditLog.payload.scheduleBlockId), context)
    ?? getTaskTitleByBlockId(getPayloadString(auditLog.payload.sourceBlockId), context)
    ?? (auditLog.entityType === "schedule_block" ? getTaskTitleByBlockId(auditLog.entityId, context) : null)
    ?? getTaskTitle(auditLog, context)
  );
}

function getCalendarEventTitle(auditLog: AuditLog, context: AuditLogLookupContext) {
  return (
    getPayloadString(auditLog.payload.calendarEventTitle)
    ?? getCalendarEventTitleById(getPayloadString(auditLog.payload.calendarEventId), context)
    ?? (auditLog.entityType === "calendar_event" ? getCalendarEventTitleById(auditLog.entityId, context) : null)
  );
}

function getTaskTitleByBlockId(blockId: string | null, context: AuditLogLookupContext) {
  if (!blockId) {
    return null;
  }

  const taskId = context.scheduleBlocksById.get(blockId)?.taskId;
  return taskId ? getTaskTitleById(taskId, context) : null;
}

function getTaskTitleById(taskId: string | null, context: AuditLogLookupContext) {
  return taskId ? context.tasksById.get(taskId)?.title ?? null : null;
}

function getCalendarEventTitleById(calendarEventId: string | null, context: AuditLogLookupContext) {
  return calendarEventId ? context.calendarEventsById.get(calendarEventId)?.title ?? null : null;
}

function getPayloadString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function withTitleOrDiff(prefix: string, title: string | null, diffSummary: string) {
  return title ? `${prefix} "${title}"` : diffSummary;
}
