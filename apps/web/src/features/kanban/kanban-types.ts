import type { CalendarEventView, ScheduleBlock, Task, TaskPriority, TaskStatus } from "@timefraim/shared";

export const KANBAN_STATUSES = [
  "inbox",
  "planned",
  "scheduled",
  "in_progress",
  "done",
] as const satisfies TaskStatus[];

export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

export type KanbanColumnDefinition = {
  status: KanbanStatus;
  title: string;
  caption: string;
};

export type KanbanTaskUpdateInput = {
  priority?: TaskPriority;
  status?: TaskStatus;
  completedOnDate?: string | null;
  plannerDate?: string;
  tzOffsetMinutes?: number;
};

export type KanbanScheduleBlockInput = {
  taskId: string;
  startAt: string;
  endAt: string;
  source: "manual";
  plannerDate?: string;
  tzOffsetMinutes?: number;
};

export type KanbanMoveHandlers = {
  onCreateScheduleBlock: (values: KanbanScheduleBlockInput) => Promise<unknown>;
  onDeleteScheduleBlock: (scheduleBlockId: string) => Promise<unknown>;
  onUpdateTask: (taskId: string, values: KanbanTaskUpdateInput) => Promise<unknown>;
};

export type KanbanMoveInput = KanbanMoveHandlers & {
  calendarEvents: CalendarEventView[];
  date: string;
  scheduleBlocks: ScheduleBlock[];
  targetStatus: KanbanStatus;
  task: Task;
};
