import { DndContext, DragOverlay, pointerWithin, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { Task } from "@timefraim/shared";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KanbanCardPreview } from "@/features/kanban/kanban-card";
import { KanbanColumn } from "@/features/kanban/kanban-column";
import { showKanbanActionError } from "@/features/kanban/kanban-errors";
import { KanbanToolbar } from "@/features/kanban/kanban-toolbar";
import { KANBAN_STATUSES, type KanbanStatus } from "@/features/kanban/kanban-types";
import {
  filterKanbanTasks,
  groupTasksByKanbanStatus,
  KANBAN_COLUMNS,
  moveTaskOnKanban,
} from "@/features/kanban/kanban-utils";
import type { PlannerPageProps } from "@/features/planner/types";

type KanbanPageProps = Pick<
  PlannerPageProps,
  | "date"
  | "dayPlan"
  | "isMutating"
  | "onCreateScheduleBlock"
  | "onDateChange"
  | "onDeleteScheduleBlock"
  | "onStartTimer"
  | "onUpdateTask"
>;

export function KanbanPage({
  date,
  dayPlan,
  isMutating,
  onCreateScheduleBlock,
  onDateChange,
  onDeleteScheduleBlock,
  onStartTimer,
  onUpdateTask,
}: KanbanPageProps) {
  const [search, setSearch] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const visibleTasks = useMemo(() => filterKanbanTasks(dayPlan.tasks, search), [dayPlan.tasks, search]);
  const groupedTasks = useMemo(() => groupTasksByKanbanStatus(visibleTasks), [visibleTasks]);
  const scheduledTodayCount = dayPlan.scheduleBlocks.length;
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

  const handlePlanTask = (task: Task) => {
    void moveTaskOnKanban({
      calendarEvents: dayPlan.calendarEvents,
      date,
      onCreateScheduleBlock,
      onDeleteScheduleBlock,
      onUpdateTask,
      scheduleBlocks: dayPlan.scheduleBlocks,
      targetStatus: "scheduled",
      task,
    })
      .then(() => toast.success("Planned on the timeline", { duration: 3000 }))
      .catch((error) => showKanbanActionError("Failed to plan the task. Please try again.", error));
  };

  const handleStartTimer = (taskId: string) => {
    void onStartTimer(taskId).catch((error) =>
      showKanbanActionError("Failed to start the timer. Please try again.", error),
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveTask(null)}>
      <div className="space-y-6" aria-busy={isMutating}>
        <KanbanToolbar
          date={date}
          doneCount={doneCount}
          search={search}
          scheduledTodayCount={scheduledTodayCount}
          taskCount={visibleTasks.length}
          onDateChange={onDateChange}
          onSearchChange={setSearch}
        />
        <div className="grid gap-4 xl:grid-cols-5">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
              column={column}
              date={date}
              scheduleBlocks={dayPlan.scheduleBlocks}
              tasks={groupedTasks[column.status]}
              onPlanTask={handlePlanTask}
              onStartTimer={handleStartTimer}
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

function readKanbanTask(data: unknown): Task | null {
  if (!data || typeof data !== "object" || !("dragType" in data) || data.dragType !== "kanban-task") {
    return null;
  }
  return "task" in data ? (data.task as Task) : null;
}

function readKanbanStatus(data: unknown): KanbanStatus | null {
  if (!data || typeof data !== "object" || !("kanbanStatus" in data)) {
    return null;
  }
  const value = data.kanbanStatus;
  return KANBAN_STATUSES.includes(value as KanbanStatus) ? (value as KanbanStatus) : null;
}

function getColumnTitle(status: KanbanStatus) {
  return KANBAN_COLUMNS.find((column) => column.status === status)?.title ?? "Board";
}
