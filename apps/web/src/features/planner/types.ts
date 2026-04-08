import type { DayPlan, Task } from "@timefraim/shared";

export type TaskLifecycleValue = "active" | "done" | "archived";

export type TaskFormValues = {
  title: string;
  notes: string;
  estimatedMinutes: number;
  priority: Task["priority"];
  lifecycle: TaskLifecycleValue;
};

export type CreateTaskValues = Omit<TaskFormValues, "lifecycle">;

export type PlannerPageProps = {
  date: string;
  dayPlan: DayPlan;
  onDateChange: (nextDate: string) => void;
  onCreateTask: (values: {
    title: string;
    notes?: string;
    estimatedMinutes: number;
    priority: Task["priority"];
    status: Task["status"];
  }) => Promise<unknown>;
  onUpdateTask: (
    taskId: string,
    values: Partial<Omit<TaskFormValues, "lifecycle"> & { status: Task["status"] }>,
  ) => Promise<unknown>;
  onDeleteTask: (taskId: string) => Promise<unknown>;
  onCreateScheduleBlock: (values: {
    taskId: string;
    startAt: string;
    endAt: string;
    source: "manual";
  }) => Promise<unknown>;
  onUpdateScheduleBlock: (scheduleBlockId: string, values: {
    startAt?: string;
    endAt?: string;
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
