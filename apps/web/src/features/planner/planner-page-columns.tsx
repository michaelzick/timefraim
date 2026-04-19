import type { DayPlan, Task, TogglIntegrationSettings } from "@timefraim/shared";
import type { UseFormReturn } from "react-hook-form";
import { TimelineBoard } from "@/components/timeline-board";
import { CreateTaskCard } from "@/features/planner/create-task-card";
import { TaskQueueCard } from "@/features/planner/task-queue-card";
import type { CreateTaskValues } from "@/features/planner/types";

export { PlannerDetailColumn } from "@/features/planner/planner-detail-column";

type PlannerQueueColumnProps = {
  createTaskForm: UseFormReturn<CreateTaskValues>;
  totalTasks: number;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  selectedTaskId: string | null;
  activeTimerTaskId: string | null;
  tasks: Task[];
  doneTasks: Task[];
  onCreateTask: (values: CreateTaskValues) => Promise<void>;
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
  selectedTaskId,
  activeTimerTaskId,
  tasks,
  doneTasks,
  onCreateTask,
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
        selectedTaskId={selectedTaskId}
        activeTimerTaskId={activeTimerTaskId}
        tasks={tasks}
        doneTasks={doneTasks}
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
  selectedTimelineTaskId: string | null;
  selectedTimelineCalendarEventId: string | null;
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
  selectedTimelineTaskId,
  selectedTimelineCalendarEventId,
  onSelectTask,
  onSelectCalendarEvent,
  onDismissCalendarEvent,
  onDeleteScheduleBlock,
  onDuplicateTask,
  onStartTaskTimer,
  onMarkTaskDone,
}: PlannerTimelineColumnProps) {
  return (
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
  );
}

