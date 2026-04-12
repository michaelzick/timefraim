import type { DayPlan, Task, TogglIntegrationSettings } from "@timefraim/shared";
import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { TimelineBoard } from "@/components/timeline-board";
import { CreateTaskCard } from "@/features/planner/create-task-card";
import { PlannerActivityCard } from "@/features/planner/planner-activity-card";
import { PlannerSummaryCard } from "@/features/planner/planner-summary-card";
import { TaskDetailCard } from "@/features/planner/task-detail-card";
import { TaskQueueCard } from "@/features/planner/task-queue-card";
import type { CreateTaskValues, TaskFormValues } from "@/features/planner/types";

type PlannerQueueColumnProps = {
  createTaskForm: UseFormReturn<CreateTaskValues>;
  totalTasks: number;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  search: string;
  selectedTaskId: string | null;
  tasks: Task[];
  onCreateTask: (values: CreateTaskValues) => Promise<void>;
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string, title: string) => void;
};

export function PlannerQueueColumn({
  createTaskForm,
  totalTasks,
  isMutating,
  togglSettings,
  search,
  selectedTaskId,
  tasks,
  onCreateTask,
  onSearchChange,
  onSelectTask,
  onDeleteTask,
}: PlannerQueueColumnProps) {
  return (
    <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
      <CreateTaskCard
        form={createTaskForm}
        totalTasks={totalTasks}
        isMutating={isMutating}
        togglSettings={togglSettings}
        onSubmit={onCreateTask}
      />
      <TaskQueueCard
        search={search}
        selectedTaskId={selectedTaskId}
        tasks={tasks}
        onSearchChange={onSearchChange}
        onSelectTask={onSelectTask}
        onDeleteTask={onDeleteTask}
      />
    </div>
  );
}

type PlannerTimelineColumnProps = {
  date: string;
  dayPlan: DayPlan;
  isSyncing: boolean;
  onDateChange: (nextDate: string) => void;
  onSyncCalendar: () => void;
  onSelectTask: (taskId: string) => void;
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
  onDeleteScheduleBlock: (scheduleBlockId: string, title: string) => void;
};

export function PlannerTimelineColumn({
  date,
  dayPlan,
  isSyncing,
  onDateChange,
  onSyncCalendar,
  onSelectTask,
  onDismissCalendarEvent,
  onDeleteScheduleBlock,
}: PlannerTimelineColumnProps) {
  return (
    <div className="space-y-6">
      <PlannerSummaryCard
        date={date}
        integrationStatus={dayPlan.integrationStatus}
        isSyncing={isSyncing}
        onDateChange={onDateChange}
        onSyncCalendar={onSyncCalendar}
      />
      <TimelineBoard
        date={date}
        tasks={dayPlan.tasks}
        scheduleBlocks={dayPlan.scheduleBlocks}
        calendarEvents={dayPlan.calendarEvents}
        onSelectTask={onSelectTask}
        onDismissCalendarEvent={onDismissCalendarEvent}
        onDeleteScheduleBlock={onDeleteScheduleBlock}
      />
    </div>
  );
}

type PlannerDetailColumnProps = {
  detailPanelRef: RefObject<HTMLDivElement | null>;
  detailForm: UseFormReturn<TaskFormValues>;
  selectedTask: Task | null;
  dayPlan: DayPlan;
  activeTimerTaskId: string | null;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  onDeleteTask: () => void;
  onSaveTask: (values: TaskFormValues) => Promise<void>;
  onStartTimer: (taskId: string) => void;
  onStopTimer: () => void;
  onConfirmDraft: (draftId: string) => void;
  onRejectDraft: (draftId: string) => void;
};

export function PlannerDetailColumn({
  detailPanelRef,
  detailForm,
  selectedTask,
  dayPlan,
  activeTimerTaskId,
  isMutating,
  togglSettings,
  onDeleteTask,
  onSaveTask,
  onStartTimer,
  onStopTimer,
  onConfirmDraft,
  onRejectDraft,
}: PlannerDetailColumnProps) {
  return (
    <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
      <TaskDetailCard
        detailPanelRef={detailPanelRef}
        form={detailForm}
        selectedTask={selectedTask}
        activeTimerTaskId={activeTimerTaskId}
        isMutating={isMutating}
        togglSettings={togglSettings}
        onDeleteTask={onDeleteTask}
        onSaveTask={onSaveTask}
        onStartTimer={onStartTimer}
        onStopTimer={onStopTimer}
      />
      <PlannerActivityCard
        dayPlan={dayPlan}
        onConfirmDraft={onConfirmDraft}
        onRejectDraft={onRejectDraft}
        onStopTimer={onStopTimer}
      />
    </div>
  );
}
