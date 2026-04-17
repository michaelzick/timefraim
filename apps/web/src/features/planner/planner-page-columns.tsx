import type { CalendarEventView, DayPlan, Task, TogglIntegrationSettings } from "@timefraim/shared";
import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { TimelineBoard } from "@/components/timeline-board";
import { CalendarEventDetailCard } from "@/features/planner/calendar-event-detail-card";
import { CreateTaskCard } from "@/features/planner/create-task-card";
import { PlannerActivityCard } from "@/features/planner/planner-activity-card";
import { PlannerSummaryCard } from "@/features/planner/planner-summary-card";
import { TaskDetailCard } from "@/features/planner/task-detail-card";
import { TaskQueueCard } from "@/features/planner/task-queue-card";
import type { CalendarEventFormValues, CreateTaskValues, TaskFormValues } from "@/features/planner/types";

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
  selectedTimelineTaskId: string | null;
  selectedTimelineCalendarEventId: string | null;
  onDateChange: (nextDate: string) => void;
  onSyncCalendar: () => void;
  onSelectTask: (taskId: string) => void;
  onSelectCalendarEvent: (calendarEventId: string) => void;
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
  onDeleteScheduleBlock: (scheduleBlockId: string, title: string) => void;
};

export function PlannerTimelineColumn({
  date,
  dayPlan,
  isSyncing,
  selectedTimelineTaskId,
  selectedTimelineCalendarEventId,
  onDateChange,
  onSyncCalendar,
  onSelectTask,
  onSelectCalendarEvent,
  onDismissCalendarEvent,
  onDeleteScheduleBlock,
}: PlannerTimelineColumnProps) {
  return (
    <div className="space-y-6">
      <PlannerSummaryCard
        date={date}
        isSyncing={isSyncing}
        onDateChange={onDateChange}
        onSyncCalendar={onSyncCalendar}
      />
      <TimelineBoard
        date={date}
        tasks={dayPlan.tasks}
        scheduleBlocks={dayPlan.scheduleBlocks}
        calendarEvents={dayPlan.calendarEvents}
        selectedTaskId={selectedTimelineTaskId}
        selectedCalendarEventId={selectedTimelineCalendarEventId}
        onSelectTask={onSelectTask}
        onSelectCalendarEvent={onSelectCalendarEvent}
        onDismissCalendarEvent={onDismissCalendarEvent}
        onDeleteScheduleBlock={onDeleteScheduleBlock}
      />
    </div>
  );
}

type PlannerDetailColumnProps = {
  detailPanelRef: RefObject<HTMLDivElement | null>;
  detailForm: UseFormReturn<TaskFormValues>;
  calendarEventForm: UseFormReturn<CalendarEventFormValues>;
  selectedTask: Task | null;
  selectedCalendarEvent: CalendarEventView | null;
  dayPlan: DayPlan;
  activeTimerTaskId: string | null;
  activeTimerCalendarEventId: string | null;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  onDeleteTask: () => void;
  onSaveTask: (values: TaskFormValues) => Promise<void>;
  onSaveCalendarEvent: (values: CalendarEventFormValues) => Promise<void>;
  onStartTimer: (taskId: string) => void;
  onStartEventTimer: (calendarEventId: string) => void;
  onStopTimer: () => void;
  onConfirmDraft: (draftId: string) => void;
  onRejectDraft: (draftId: string) => void;
};

export function PlannerDetailColumn({
  detailPanelRef,
  detailForm,
  calendarEventForm,
  selectedTask,
  selectedCalendarEvent,
  dayPlan,
  activeTimerTaskId,
  activeTimerCalendarEventId,
  isMutating,
  togglSettings,
  onDeleteTask,
  onSaveTask,
  onSaveCalendarEvent,
  onStartTimer,
  onStartEventTimer,
  onStopTimer,
  onConfirmDraft,
  onRejectDraft,
}: PlannerDetailColumnProps) {
  return (
    <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
      {selectedCalendarEvent ? (
        <CalendarEventDetailCard
          detailPanelRef={detailPanelRef}
          event={selectedCalendarEvent}
          activeTimerCalendarEventId={activeTimerCalendarEventId}
          isMutating={isMutating}
          togglSettings={togglSettings}
          form={calendarEventForm}
          onSaveEvent={onSaveCalendarEvent}
          onStartEventTimer={onStartEventTimer}
          onStopTimer={onStopTimer}
        />
      ) : (
        <TaskDetailCard
          detailPanelRef={detailPanelRef}
          form={detailForm}
          selectedTask={selectedTask}
          activeTimer={dayPlan.activeTimer}
          activeTimerTaskId={activeTimerTaskId}
          tasks={dayPlan.tasks}
          isMutating={isMutating}
          togglSettings={togglSettings}
          onDeleteTask={onDeleteTask}
          onSaveTask={onSaveTask}
          onStartTimer={onStartTimer}
          onStopTimer={onStopTimer}
        />
      )}
      <PlannerActivityCard
        dayPlan={dayPlan}
        togglSettings={togglSettings}
        onConfirmDraft={onConfirmDraft}
        onRejectDraft={onRejectDraft}
        onStopTimer={onStopTimer}
      />
    </div>
  );
}
