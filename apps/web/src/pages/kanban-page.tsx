import { DndContext, DragOverlay, pointerWithin, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { Task } from "@timefraim/shared";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KanbanCardPreview } from "@/features/kanban/kanban-card";
import { clearDoneTasks } from "@/features/kanban/kanban-clear-done";
import { KanbanColumn } from "@/features/kanban/kanban-column";
import { KanbanCreateTaskPanel } from "@/features/kanban/kanban-create-task-panel";
import { buildKanbanCreateTaskInput } from "@/features/kanban/kanban-create-task-utils";
import { getColumnTitle, readKanbanStatus, readKanbanTask } from "@/features/kanban/kanban-dnd";
import { showKanbanActionError } from "@/features/kanban/kanban-errors";
import { KanbanToolbar } from "@/features/kanban/kanban-toolbar";
import type { KanbanStatus } from "@/features/kanban/kanban-types";
import {
  filterKanbanTasks,
  groupTasksByKanbanStatus,
  KANBAN_COLUMNS,
  moveTaskOnKanban,
} from "@/features/kanban/kanban-utils";
import { formatTaskPriority } from "@/features/planner/task-presentation";
import type { CreateTaskValues, PlannerPageProps } from "@/features/planner/types";

type KanbanPageProps = Pick<
  PlannerPageProps,
  | "date"
  | "dayPlan"
  | "isMutating"
  | "onCreateTask"
  | "onCreateScheduleBlock"
  | "onDeleteScheduleBlock"
  | "onDeleteTask"
  | "onStartTimer"
  | "onStopTimer"
  | "onUpdateTask"
  | "togglSettings"
>;

export function KanbanPage({
  date,
  dayPlan,
  isMutating,
  onCreateTask,
  onCreateScheduleBlock,
  onDeleteScheduleBlock,
  onDeleteTask,
  onStartTimer,
  onStopTimer,
  onUpdateTask,
  togglSettings,
}: KanbanPageProps) {
  const [search, setSearch] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const visibleTasks = useMemo(() => filterKanbanTasks(dayPlan.tasks, search), [dayPlan.tasks, search]);
  const groupedTasks = useMemo(() => groupTasksByKanbanStatus(visibleTasks), [visibleTasks]);
  const scheduledCount = groupedTasks.scheduled.length;
  const doneCount = groupedTasks.done.length;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(readKanbanTask(event.active.data.current));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const task = readKanbanTask(event.active.data.current);
    const targetStatus = readKanbanStatus(event.over?.data.current);
    setActiveTask(null);
    if (!task || !targetStatus) {
      return;
    }
    void moveTaskOnKanban({
      calendarEvents: dayPlan.calendarEvents,
      date,
      onCreateScheduleBlock,
      onDeleteScheduleBlock,
      onUpdateTask,
      scheduleBlocks: dayPlan.scheduleBlocks,
      targetStatus,
      task,
    })
      .then(() => toast.success(`Moved to ${getColumnTitle(targetStatus)}`, { duration: 3000 }))
      .catch((error) => showKanbanActionError("Failed to move the task. Please try again.", error));
  };

  const handlePlanTask = (task: Task, targetStatus: KanbanStatus) => {
    void moveTaskOnKanban({
      calendarEvents: dayPlan.calendarEvents,
      date,
      onCreateScheduleBlock,
      onDeleteScheduleBlock,
      onUpdateTask,
      scheduleBlocks: dayPlan.scheduleBlocks,
      targetStatus,
      task,
    })
      .then(() =>
        toast.success(
          targetStatus === "scheduled" ? "Scheduled on the timeline" : "Moved to Planned",
          { duration: 3000 },
        ),
      )
      .catch((error) => showKanbanActionError("Failed to move the task. Please try again.", error));
  };

  const handleStartTimer = (taskId: string) => {
    void onStartTimer(taskId).catch((error) =>
      showKanbanActionError("Failed to start the timer. Please try again.", error),
    );
  };

  const handleStopTimer = () => {
    void onStopTimer().catch((error) =>
      showKanbanActionError("Failed to stop the timer. Please try again.", error),
    );
  };

  const handleRemoveTask = (task: Task) => {
    void moveTaskOnKanban({
      calendarEvents: dayPlan.calendarEvents,
      date,
      onCreateScheduleBlock,
      onDeleteScheduleBlock,
      onUpdateTask,
      scheduleBlocks: dayPlan.scheduleBlocks,
      targetStatus: "inbox",
      task,
    })
      .then(() => toast.success("Moved to Inbox", { duration: 3000 }))
      .catch((error) => showKanbanActionError("Failed to remove the task. Please try again.", error));
  };

  const handleDeleteTask = (task: Task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    void onDeleteTask(task.id)
      .then(() => toast.success("Deleted", { duration: 3000 }))
      .catch((error) => showKanbanActionError("Failed to delete the task. Please try again.", error));
  };

  const handleClearDone = () => void clearDoneTasks(groupedTasks.done, onDeleteTask);

  const handlePriorityChange = (task: Task, priority: Task["priority"]) => {
    if (task.priority === priority) {
      return;
    }

    void onUpdateTask(task.id, { priority })
      .then(() => toast.success(`Priority changed to ${formatTaskPriority(priority)}`, { duration: 3000 }))
      .catch((error) => showKanbanActionError("Failed to change priority. Please try again.", error));
  };

  const handleCreateTask = async (values: CreateTaskValues) => {
    try {
      await onCreateTask(buildKanbanCreateTaskInput(values));
      toast.success("Task added to Inbox", { duration: 3000 });
    } catch (error) {
      showKanbanActionError("Failed to create the task. Please try again.", error);
      throw error;
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveTask(null)}>
      <div className="space-y-6" aria-busy={isMutating}>
        <KanbanToolbar
          doneCount={doneCount}
          search={search}
          scheduledCount={scheduledCount}
          taskCount={visibleTasks.length}
          isCreateTaskOpen={isCreateTaskOpen}
          onCreateTaskToggle={() => setIsCreateTaskOpen((current) => !current)}
          onSearchChange={setSearch}
        />
        {isCreateTaskOpen ? (
          <KanbanCreateTaskPanel
            isMutating={isMutating}
            togglSettings={togglSettings}
            onClose={() => setIsCreateTaskOpen(false)}
            onSubmit={handleCreateTask}
          />
        ) : null}
        <div className="grid gap-4 xl:grid-cols-5">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
              activeTimerStartedAt={dayPlan.activeTimer?.startedAt ?? null}
              column={column}
              date={date}
              scheduleBlocks={dayPlan.scheduleBlocks}
              tasks={groupedTasks[column.status]}
              onClearDone={column.status === "done" ? handleClearDone : undefined}
              onDeleteTask={handleDeleteTask}
              onPlanTask={handlePlanTask}
              onPriorityChange={handlePriorityChange}
              onRemoveTask={handleRemoveTask}
              onStartTimer={handleStartTimer}
              onStopTimer={handleStopTimer}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <KanbanCardPreview task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
