import { DndContext, DragOverlay, pointerWithin, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { Task } from "@timefraim/shared";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KanbanActiveTimerBanner } from "@/features/kanban/kanban-active-timer-banner";
import { KanbanCardPreview } from "@/features/kanban/kanban-card-preview";
import { clearDoneTasks } from "@/features/kanban/kanban-clear-done";
import { KanbanColumn } from "@/features/kanban/kanban-column";
import { KanbanCreateTaskPanel } from "@/features/kanban/kanban-create-task-panel";
import { buildKanbanCreateTaskInput } from "@/features/kanban/kanban-create-task-utils";
import { readKanbanStatus, readKanbanTask } from "@/features/kanban/kanban-dnd";
import { showKanbanActionError } from "@/features/kanban/kanban-errors";
import { createKanbanMoveRunner } from "@/features/kanban/kanban-move-handlers";
import { KanbanToolbar } from "@/features/kanban/kanban-toolbar";
import type { KanbanStatus } from "@/features/kanban/kanban-types";
import {
  filterKanbanTasks,
  groupTasksByKanbanStatus,
  KANBAN_COLUMNS,
} from "@/features/kanban/kanban-utils";
import {
  DEFAULT_COLUMN_SORT_MODES,
  sortGroupedColumns,
  type KanbanSortMode,
} from "@/features/kanban/kanban-sort";
import { createCategoryChangeHandler, createPriorityChangeHandler } from "@/features/kanban/kanban-task-field-handlers";
import type { TaskCategoryFilter } from "@/features/planner/planner-page-selection";
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
  const [categoryFilter, setCategoryFilter] = useState<TaskCategoryFilter>("all");
  const [columnSortModes, setColumnSortModes] = useState(DEFAULT_COLUMN_SORT_MODES);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const visibleTasks = useMemo(
    () => filterKanbanTasks(dayPlan.tasks, search, categoryFilter),
    [dayPlan.tasks, search, categoryFilter],
  );
  const groupedTasks = useMemo(() => groupTasksByKanbanStatus(visibleTasks), [visibleTasks]);
  const sortedColumns = useMemo(
    () => sortGroupedColumns(groupedTasks, columnSortModes, dayPlan.scheduleBlocks),
    [groupedTasks, columnSortModes, dayPlan.scheduleBlocks],
  );
  const scheduledCount = groupedTasks.scheduled.length;
  const doneCount = groupedTasks.done.length;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(readKanbanTask(event.active.data.current));
  };

  const runKanbanMove = createKanbanMoveRunner({
    calendarEvents: dayPlan.calendarEvents,
    date,
    onCreateScheduleBlock,
    onDeleteScheduleBlock,
    onUpdateTask,
    scheduleBlocks: dayPlan.scheduleBlocks,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const task = readKanbanTask(event.active.data.current);
    const targetStatus = readKanbanStatus(event.over?.data.current);
    setActiveTask(null);
    if (!task || !targetStatus) {
      return;
    }
    void runKanbanMove(task, targetStatus);
  };

  const handlePlanTask = (task: Task, targetStatus: KanbanStatus) => {
    void runKanbanMove(task, targetStatus);
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
    void runKanbanMove(task, "inbox");
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

  const handlePriorityChange = createPriorityChangeHandler(onUpdateTask);
  const handleCategoryChange = createCategoryChangeHandler(onUpdateTask);

  const handleSortModeChange = (status: KanbanStatus, mode: KanbanSortMode) =>
    setColumnSortModes((current) => ({ ...current, [status]: mode }));

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
          categoryFilter={categoryFilter}
          isCreateTaskOpen={isCreateTaskOpen}
          onCreateTaskToggle={() => setIsCreateTaskOpen((current) => !current)}
          onCategoryFilterChange={setCategoryFilter}
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
        <KanbanActiveTimerBanner
          dayPlan={dayPlan}
          togglSettings={togglSettings}
          onStopTimer={handleStopTimer}
        />
        <div className="grid gap-4 xl:grid-cols-4">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
              activeTimerStartedAt={dayPlan.activeTimer?.startedAt ?? null}
              column={column}
              date={date}
              scheduleBlocks={dayPlan.scheduleBlocks}
              sortMode={columnSortModes[column.status]}
              tasks={sortedColumns[column.status]}
              onClearDone={column.status === "done" ? handleClearDone : undefined}
              onDeleteTask={handleDeleteTask}
              onPlanTask={handlePlanTask}
              onPriorityChange={handlePriorityChange}
              onCategoryChange={handleCategoryChange}
              onRemoveTask={handleRemoveTask}
              onSortModeChange={(mode) => handleSortModeChange(column.status, mode)}
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
