import type { DayPlan, Task } from "@timefraim/shared";

export type TaskFormValues = {
  title: string;
  notes: string;
  estimatedMinutes: number;
  status: Task["status"];
};

export type CreateTaskValues = TaskFormValues;

export type PlannerPageProps = {
  date: string;
  dayPlan: DayPlan;
  onDateChange: (nextDate: string) => void;
  onCreateTask: (values: {
    title: string;
    notes?: string;
    estimatedMinutes: number;
    status: Task["status"];
  }) => Promise<unknown>;
  onUpdateTask: (taskId: string, values: Partial<TaskFormValues>) => Promise<unknown>;
  onDeleteTask: (taskId: string) => Promise<unknown>;
  onCreateScheduleBlock: (values: {
    taskId: string;
    startAt: string;
    endAt: string;
    source: "manual";
  }) => Promise<unknown>;
  onDeleteScheduleBlock: (scheduleBlockId: string) => Promise<unknown>;
  onDismissCalendarEvent: (calendarEventId: string) => Promise<unknown>;
  onConfirmDraft: (draftId: string) => Promise<unknown>;
  onRejectDraft: (draftId: string) => Promise<unknown>;
  onStartTimer: (taskId: string) => Promise<unknown>;
  onStopTimer: () => Promise<unknown>;
  onSyncCalendar: () => Promise<unknown>;
  isSyncing: boolean;
  isMutating: boolean;
};

export const STATUS_OPTIONS: Task["status"][] = [
  "inbox",
  "planned",
  "scheduled",
  "in_progress",
  "done",
  "archived",
];
