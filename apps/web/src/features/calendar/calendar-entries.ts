import type { Task } from "@timefraim/shared";
import { formatPlannerDateFromIso } from "@/lib/utils";

export type CalendarEntry = {
  task: Task;
  date: string;
  blockId: string | null;
  startAt: string | null;
  endAt: string | null;
};

export function getCalendarEntry(task: Task): CalendarEntry | null {
  if (task.scheduledBlockId && task.scheduledStartAt && task.scheduledEndAt) {
    const date = formatPlannerDateFromIso(task.scheduledStartAt);
    if (date) {
      return {
        task,
        date,
        blockId: task.scheduledBlockId,
        startAt: task.scheduledStartAt,
        endAt: task.scheduledEndAt,
      };
    }
  }

  if (task.status === "done" && task.completedOnDate) {
    return { task, date: task.completedOnDate, blockId: null, startAt: null, endAt: null };
  }

  return null;
}

function compareEntries(left: CalendarEntry, right: CalendarEntry) {
  if (left.startAt && right.startAt) {
    return new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
  }
  if (left.startAt || right.startAt) {
    return left.startAt ? -1 : 1;
  }
  return left.task.title.localeCompare(right.task.title);
}

export function groupCalendarEntries(tasks: Task[]) {
  const entriesByDate = new Map<string, CalendarEntry[]>();
  for (const task of tasks) {
    const entry = getCalendarEntry(task);
    if (!entry) continue;
    const entries = entriesByDate.get(entry.date);
    if (entries) {
      entries.push(entry);
    } else {
      entriesByDate.set(entry.date, [entry]);
    }
  }
  for (const entries of entriesByDate.values()) {
    entries.sort(compareEntries);
  }
  return entriesByDate;
}
