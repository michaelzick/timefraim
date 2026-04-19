import type { DayPlan, Task, TogglIntegrationSettings } from "@timefraim/shared";
import type { UseFormReturn } from "react-hook-form";
import { TimelineBoard } from "@/components/timeline-board";
import { CreateTaskCard } from "@/features/planner/create-task-card";
import { PlannerSummaryCard } from "@/features/planner/planner-summary-card";
import { TaskQueueCard } from "@/features/planner/task-queue-card";
import type { CreateTaskValues } from "@/features/planner/types";

export { PlannerDetailColumn } from "@/features/planner/planner-detail-column";

type PlannerQueueColumnProps = {
  createTaskForm: UseFormReturn<CreateTaskValues>;
  totalTasks: number;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  search: string;
  selectedTaskId: string | null;
  activeTimerTaskId: string | null;
  tasks: Task[];
  doneTasks: Task[];
  onCreateTask: (values: CreateTaskValues) => Promise<void>;
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string, title: string) => void;
  onDuplicateTask: (task: Task) => void;
  onStartTaskTimer: (taskId: string) => void;
  onMarkTaskDone: (task: Task) => void;
  onReactivateDoneTask: (task: Task) => void;
};

export function PlannerQueueColumn({
  createTaskForm,
  totalTasks,
  isMutating,
  togglSettings,
  search,
  selectedTaskId,
  activeTimerTaskId,
  tasks,
  doneTasks,
  onCreateTask,
  onSearchChange,
  onSelectTask,
  onDeleteTask,
  onDuplicateTask,
  onStartTaskTimer,
  onMarkTaskDone,
  onReactivateDoneTask,
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
        activeTimerTaskId={activeTimerTaskId}
        tasks={tasks}
        doneTasks={doneTasks}
        onSearchChange={onSearchChange}
        onSelectTask={onSelectTask}
        onDeleteTask={onDeleteTask}
        onDuplicateTask={onDuplicateTask}
        onStartTaskTimer={onStartTaskTimer}
        onMarkTaskDone={onMarkTaskDone}
        onReactivateDoneTask={onReactivateDoneTask}
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
  onDuplicateTask: (task: Task) => void;
  onStartTaskTimer: (taskId: string) => void;
  onMarkTaskDone: (task: Task) => void;
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
  onDuplicateTask,
  onStartTaskTimer,
  onMarkTaskDone,
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
        activeTimer={dayPlan.activeTimer}
        selectedTaskId={selectedTimelineTaskId}
        selectedCalendarEventId={selectedTimelineCalendarEventId}
        onSelectTask={onSelectTask}
        onSelectCalendarEvent={onSelectCalendarEvent}
        onDismissCalendarEvent={onDismissCalendarEvent}
        onDeleteScheduleBlock={onDeleteScheduleBlock}
        onDuplicateTask={onDuplicateTask}
        onStartTaskTimer={onStartTaskTimer}
        onMarkTaskDone={onMarkTaskDone}
      />
    </div>
  );
}

