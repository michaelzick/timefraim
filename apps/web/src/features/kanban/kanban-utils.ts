import type { CalendarEventView, ScheduleBlock, Task } from "@timefraim/shared";
import { getTimelineWindow, TIMELINE_INCREMENT_MINUTES } from "@/components/timeline-geometry";
import { getTimezoneOffsetForDate } from "@/lib/utils";
import type { KanbanMoveInput, KanbanStatus } from "@/features/kanban/kanban-types";

export const KANBAN_COLUMNS = [
  { status: "inbox", title: "Inbox", caption: "Ideas and unsorted work" },
  { status: "planned", title: "Planned", caption: "Ready to schedule" },
  { status: "scheduled", title: "Scheduled", caption: "Committed on a timeline" },
  { status: "in_progress", title: "In Progress", caption: "Actively being worked" },
  { status: "done", title: "Done", caption: "Completed work" },
] as const;

const PRIORITY_RANK: Record<Task["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PLANNING_START_HOUR = 9;
const MINUTE_MS = 60_000;

export function resolveKanbanStatus(task: Task): KanbanStatus {
  if (task.status === "done" || task.status === "in_progress") {
    return task.status;
  }
  return task.scheduledBlockId ? "scheduled" : task.status;
}

export function buildPlannerTaskHref(date: string, taskId: string) {
  const params = new URLSearchParams({ date, task: taskId });
  return `/?${params.toString()}`;
}

export function filterKanbanTasks(tasks: Task[], search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return tasks;
  }
  return tasks.filter((task) =>
    [task.title, task.notes ?? "", task.priority, resolveKanbanStatus(task)]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

export function groupTasksByKanbanStatus(tasks: Task[]) {
  const groups: Record<KanbanStatus, Task[]> = {
    inbox: [],
    planned: [],
    scheduled: [],
    in_progress: [],
    done: [],
  };
  for (const task of tasks) {
    groups[resolveKanbanStatus(task)].push(task);
  }
  for (const status of Object.keys(groups) as KanbanStatus[]) {
    groups[status].sort(compareKanbanTasks);
  }
  return groups;
}

export function findNextOpenTimelineSlot(args: {
  calendarEvents: CalendarEventView[];
  date: string;
  durationMinutes: number;
  scheduleBlocks: ScheduleBlock[];
}) {
  const window = getTimelineWindow(args.date);
  const durationMs = args.durationMinutes * MINUTE_MS;
  const startAt = new Date(`${args.date}T${String(PLANNING_START_HOUR).padStart(2, "0")}:00:00`);
  const firstStartMs = Math.max(window.startAt.getTime(), startAt.getTime());
  const lastStartMs = window.endAt.getTime() - durationMs;
  const stepMs = TIMELINE_INCREMENT_MINUTES * MINUTE_MS;

  for (let candidateMs = firstStartMs; candidateMs <= lastStartMs; candidateMs += stepMs) {
    const candidateStartAt = new Date(candidateMs).toISOString();
    const candidateEndAt = new Date(candidateMs + durationMs).toISOString();
    if (!hasTimelineConflict(candidateStartAt, candidateEndAt, args.scheduleBlocks, args.calendarEvents)) {
      return { startAt: candidateStartAt, endAt: candidateEndAt };
    }
  }
  return null;
}

export async function moveTaskOnKanban(args: KanbanMoveInput) {
  const currentStatus = resolveKanbanStatus(args.task);
  if (currentStatus === args.targetStatus) {
    return;
  }

  const tzOffsetMinutes = getTimezoneOffsetForDate(args.date);
  if (args.targetStatus === "scheduled") {
    await moveTaskIntoScheduled(args, tzOffsetMinutes);
    return;
  }

  if (args.task.scheduledBlockId && shouldRemoveScheduleBlock(args.targetStatus)) {
    await args.onDeleteScheduleBlock(args.task.scheduledBlockId);
  }
  await args.onUpdateTask(args.task.id, {
    status: args.targetStatus,
    completedOnDate: getCompletedOnDate(args.task, args.targetStatus, args.date),
    plannerDate: args.date,
    tzOffsetMinutes,
  });
}

function compareKanbanTasks(left: Task, right: Task) {
  const priorityDelta = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function hasTimelineConflict(
  startAt: string,
  endAt: string,
  scheduleBlocks: ScheduleBlock[],
  calendarEvents: CalendarEventView[],
) {
  return [...scheduleBlocks, ...calendarEvents.filter((event) => !event.isAppManaged)].some((item) =>
    new Date(startAt) < new Date(item.endAt) && new Date(item.startAt) < new Date(endAt),
  );
}

async function moveTaskIntoScheduled(args: KanbanMoveInput, tzOffsetMinutes: number) {
  if (args.task.scheduledBlockId) {
    await args.onUpdateTask(args.task.id, {
      status: "scheduled",
      completedOnDate: null,
      plannerDate: args.date,
      tzOffsetMinutes,
    });
    return;
  }

  const slot = findNextOpenTimelineSlot({
    calendarEvents: args.calendarEvents,
    date: args.date,
    durationMinutes: args.task.estimatedMinutes,
    scheduleBlocks: args.scheduleBlocks,
  });
  if (!slot) {
    throw new Error("No open timeline slot is available for this task.");
  }

  await args.onCreateScheduleBlock({
    taskId: args.task.id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    source: "manual",
    plannerDate: args.date,
    tzOffsetMinutes,
  });
  if (args.task.status === "done") {
    await args.onUpdateTask(args.task.id, { completedOnDate: null, plannerDate: args.date, tzOffsetMinutes });
  }
}

function shouldRemoveScheduleBlock(targetStatus: KanbanStatus) {
  return targetStatus === "planned" || targetStatus === "inbox";
}

function getCompletedOnDate(task: Task, targetStatus: KanbanStatus, date: string) {
  if (targetStatus === "done") {
    return date;
  }
  return task.status === "done" ? null : undefined;
}
