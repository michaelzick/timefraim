import type {
  DayPlan,
  PlannerDuplicateResult,
  TaskPriority,
  TaskStatus,
  TogglIntegrationSettings,
} from "@timefraim/shared";

export type TaskLifecycleValue = "active" | "done";

export type TaskFormValues = {
  title: string;
  notes: string;
  estimatedMinutes: number;
  priority: TaskPriority;
  lifecycle: TaskLifecycleValue;
  togglProjectId: string;
};

export type CreateTaskValues = Omit<TaskFormValues, "lifecycle">;

export type CalendarEventFormValues = {
  togglProjectId: string;
};

export type PlannerCalendarEventUpdateInput = {
  togglProjectId: string | null;
};

export type PlannerTaskInput = {
  title: string;
  notes?: string;
  estimatedMinutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  togglProjectId?: string | null;
  plannerDate?: string;
  tzOffsetMinutes?: number;
};

export type PlannerTaskUpdateInput = Partial<
  Omit<TaskFormValues, "lifecycle" | "togglProjectId"> & {
    status: TaskStatus;
    togglProjectId: string | null;
    completedOnDate: string | null;
    plannerDate: string;
    tzOffsetMinutes: number;
  }
>;

export type PlannerScheduleBlockInput = {
  taskId: string;
  startAt: string;
  endAt: string;
  source: "manual";
  plannerDate?: string;
  tzOffsetMinutes?: number;
};

export type PlannerScheduleBlockUpdateInput = {
  startAt?: string;
  endAt?: string;
  plannerDate?: string;
  tzOffsetMinutes?: number;
};

export type PlannerPageProps = {
  date: string;
  dayPlan: DayPlan;
  linkedGoogleEmail: string | null;
  onDateChange: (nextDate: string) => void;
  onCreateTask: (values: PlannerTaskInput) => Promise<unknown>;
  onUpdateTask: (taskId: string, values: PlannerTaskUpdateInput) => Promise<unknown>;
  onDeleteTask: (taskId: string) => Promise<unknown>;
  onCreateScheduleBlock: (values: PlannerScheduleBlockInput) => Promise<unknown>;
  onUpdateScheduleBlock: (scheduleBlockId: string, values: PlannerScheduleBlockUpdateInput) => Promise<unknown>;
  onDeleteScheduleBlock: (scheduleBlockId: string) => Promise<unknown>;
  onDuplicateTask: (
    taskId: string,
    body?: { startAt?: string; endAt?: string; plannerDate?: string; tzOffsetMinutes?: number },
  ) => Promise<PlannerDuplicateResult>;
  onDuplicateScheduleBlock: (
    scheduleBlockId: string,
    body: { startAt: string; endAt: string; plannerDate?: string; tzOffsetMinutes?: number },
  ) => Promise<PlannerDuplicateResult>;
  onDismissCalendarEvent: (calendarEventId: string) => Promise<unknown>;
  onUpdateCalendarEvent: (calendarEventId: string, values: PlannerCalendarEventUpdateInput) => Promise<unknown>;
  onStartTimer: (taskId: string) => Promise<unknown>;
  onStartEventTimer: (calendarEventId: string) => Promise<unknown>;
  onStopTimer: () => Promise<unknown>;
  onSyncCalendar: () => Promise<unknown>;
  isSyncing: boolean;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
};
