import type { DayPlan, Task, TogglIntegrationSettings } from "@timefraim/shared";
import type { UseFormReturn } from "react-hook-form";
import { TimelineBoard } from "@/components/timeline-board";
import { CreateTaskCard } from "@/features/planner/create-task-card";
import { TaskQueueCard } from "@/features/planner/task-queue-card";
import type { CreateTaskValues } from "@/features/planner/types";

export { PlannerDetailColumn } from "@/features/planner/planner-detail-column";

type PlannerQueueColumnProps = {
  createTaskForm: UseFormReturn<CreateTaskValues>;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  selectedTaskId: string | null;
  activeTimerTaskId: string | null;
  copyDragTaskId: string | null;
  search: string;
  tasks: Task[];
  onSearchChange: (value: string) => void;
  onCreateTask: (values: CreateTaskValues) => Promise<void>;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string, title: string) => void;
  onDuplicateTask: (task: Task) => void;
  onStartTaskTimer: (taskId: string) => void;
};

export function PlannerQueueColumn({
  createTaskForm,
  isMutating,
  togglSettings,
  selectedTaskId,
  activeTimerTaskId,
  copyDragTaskId,
  search,
  tasks,
  onSearchChange,
  onCreateTask,
  onSelectTask,
  onDeleteTask,
  onDuplicateTask,
  onStartTaskTimer,
}: PlannerQueueColumnProps) {
  return (
    <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
      <CreateTaskCard
        form={createTaskForm}
        isMutating={isMutating}
        togglSettings={togglSettings}
        onSubmit={onCreateTask}
      />
      <TaskQueueCard
        selectedTaskId={selectedTaskId}
        activeTimerTaskId={activeTimerTaskId}
        copyDragTaskId={copyDragTaskId}
        search={search}
        tasks={tasks}
        onSearchChange={onSearchChange}
        onSelectTask={onSelectTask}
        onDeleteTask={onDeleteTask}
        onDuplicateTask={onDuplicateTask}
        onStartTaskTimer={onStartTaskTimer}
      />
    </div>
  );
}

type PlannerTimelineColumnProps = {
  date: string;
  dayPlan: DayPlan;
  tasks: Task[];
  selectedTimelineTaskId: string | null;
  selectedTimelineCalendarEventId: string | null;
  copyDragScheduleBlockId: string | null;
  onSelectTask: (taskId: string) => void;
  onSelectCalendarEvent: (calendarEventId: string) => void;
  onDismissCalendarEvent: (calendarEventId: string, title: string) => void;
  onDeleteScheduleBlock: (scheduleBlockId: string, title: string) => void;
  onDuplicateTask: (task: Task) => void;
  onStartTaskTimer: (taskId: string) => void;
  onMarkTaskDone: (task: Task) => void;
  onResizeTaskDuration: (task: Task, durationMinutes: number) => void;
};

export function PlannerTimelineColumn({
  date,
  dayPlan,
  tasks,
  selectedTimelineTaskId,
  selectedTimelineCalendarEventId,
  copyDragScheduleBlockId,
  onSelectTask,
  onSelectCalendarEvent,
  onDismissCalendarEvent,
  onDeleteScheduleBlock,
  onDuplicateTask,
  onStartTaskTimer,
  onMarkTaskDone,
  onResizeTaskDuration,
}: PlannerTimelineColumnProps) {
  const visibleTaskIds = new Set(tasks.map((task) => task.id));
  const scheduleBlocks = dayPlan.scheduleBlocks.filter(
    (block) => visibleTaskIds.has(block.taskId),
  );
  return (
    <TimelineBoard
      date={date}
      tasks={tasks}
      scheduleBlocks={scheduleBlocks}
      calendarEvents={dayPlan.calendarEvents}
      activeTimer={dayPlan.activeTimer}
      selectedTaskId={selectedTimelineTaskId}
      selectedCalendarEventId={selectedTimelineCalendarEventId}
      copyDragScheduleBlockId={copyDragScheduleBlockId}
      onSelectTask={onSelectTask}
      onSelectCalendarEvent={onSelectCalendarEvent}
      onDismissCalendarEvent={onDismissCalendarEvent}
      onDeleteScheduleBlock={onDeleteScheduleBlock}
      onDuplicateTask={onDuplicateTask}
      onStartTaskTimer={onStartTaskTimer}
      onMarkTaskDone={onMarkTaskDone}
      onResizeTaskDuration={onResizeTaskDuration}
    />
  );
}
