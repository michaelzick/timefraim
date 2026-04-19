import { DndContext, DragOverlay, pointerWithin, type DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { ActiveDragPreview, type ActiveDragPayload } from "@/features/planner/active-drag-preview";
import { PlannerDetailColumn, PlannerQueueColumn, PlannerTimelineColumn } from "@/features/planner/planner-page-columns";
import type { PlannerPageProps } from "@/features/planner/types";
import { usePlannerKeyboardShortcuts } from "@/pages/use-planner-keyboard-shortcuts";
import { usePlannerPageController } from "@/pages/use-planner-page-controller";

export function PlannerPage({
  date,
  dayPlan,
  togglSettings,
  onDateChange,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreateScheduleBlock,
  onUpdateScheduleBlock,
  onDeleteScheduleBlock,
  onDismissCalendarEvent,
  onUpdateCalendarEvent,
  onDuplicateTask,
  onDuplicateScheduleBlock,
  onStartTimer,
  onStartEventTimer,
  onStopTimer,
  onSyncCalendar,
  isSyncing,
  isMutating,
}: PlannerPageProps) {
  const {
    calendarEventForm,
    createTaskForm,
    detailForm,
    detailPanelRef,
    doneTasks,
    filteredQueueTasks,
    handleCreateTask,
    handleDismissCalendarEvent,
    handleDragEnd,
    handleSaveCalendarEvent,
    handleSaveTask,
    handleSelectCalendarEvent,
    handleSelectQueueTask,
    handleSelectTimelineTask,
    isAltPressed,
    mutationHandlers,
    plannerSelection,
    search,
    selectedCalendarEvent,
    selectedTask,
    selectedTimelineCalendarEventId,
    selectedTimelineTaskId,
    sensors,
    setSearch,
  } = usePlannerPageController({
    date,
    dayPlan,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onCreateScheduleBlock,
    onUpdateScheduleBlock,
    onDeleteScheduleBlock,
    onDismissCalendarEvent,
    onUpdateCalendarEvent,
    onDuplicateTask,
    onDuplicateScheduleBlock,
    onStartTimer,
  });

  const [activeDrag, setActiveDrag] = useState<ActiveDragPayload | null>(null);
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (!data || typeof data.dragType !== "string") {
      return;
    }
    setActiveDrag(data as ActiveDragPayload);
  };
  const clearActiveDrag = () => setActiveDrag(null);

  const activeDragPayload = activeDrag ? applyCopyIntent(activeDrag, isAltPressed) : null;

  usePlannerKeyboardShortcuts({
    selectedTask,
    onDuplicateTask: (task) => mutationHandlers.handleDuplicateTask(task),
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={(event) => {
        clearActiveDrag();
        void handleDragEnd(event);
      }}
      onDragCancel={clearActiveDrag}
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <PlannerQueueColumn
          createTaskForm={createTaskForm}
          totalTasks={dayPlan.tasks.length}
          isMutating={isMutating}
          togglSettings={togglSettings}
          search={search}
          selectedTaskId={plannerSelection.type === "queue-task" ? selectedTask?.id ?? null : null}
          activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
          tasks={filteredQueueTasks}
          doneTasks={doneTasks}
          onCreateTask={handleCreateTask}
          onSearchChange={setSearch}
          onSelectTask={handleSelectQueueTask}
          onDeleteTask={(taskId, title) => mutationHandlers.handleQueueTaskDelete(taskId, title)}
          onDuplicateTask={(task) => mutationHandlers.handleDuplicateTask(task)}
          onStartTaskTimer={(taskId) => mutationHandlers.handleStartTaskTimer(taskId)}
          onMarkTaskDone={(task) => mutationHandlers.handleMarkTaskDone(task)}
          onReactivateDoneTask={(task) => mutationHandlers.handleReactivateDoneTask(task)}
        />
        <PlannerTimelineColumn
          date={date}
          dayPlan={dayPlan}
          isSyncing={isSyncing}
          selectedTimelineTaskId={selectedTimelineTaskId}
          selectedTimelineCalendarEventId={selectedTimelineCalendarEventId}
          onDateChange={onDateChange}
          onSyncCalendar={() => void onSyncCalendar()}
          onSelectTask={handleSelectTimelineTask}
          onSelectCalendarEvent={handleSelectCalendarEvent}
          onDismissCalendarEvent={(calendarEventId, title) => void handleDismissCalendarEvent(calendarEventId, title)}
          onDeleteScheduleBlock={(blockId, title) => mutationHandlers.handleDeleteTimelineBlock(blockId, title)}
          onDuplicateTask={(task) => mutationHandlers.handleDuplicateTask(task)}
          onStartTaskTimer={(taskId) => mutationHandlers.handleStartTaskTimer(taskId)}
          onMarkTaskDone={(task) => mutationHandlers.handleMarkTaskDone(task)}
        />
        <PlannerDetailColumn
          detailPanelRef={detailPanelRef}
          detailForm={detailForm}
          calendarEventForm={calendarEventForm}
          selectedTask={selectedTask}
          selectedCalendarEvent={selectedCalendarEvent}
          dayPlan={dayPlan}
          activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
          activeTimerCalendarEventId={dayPlan.activeTimer?.calendarEventId ?? null}
          isMutating={isMutating}
          togglSettings={togglSettings}
          onDeleteTask={() => void mutationHandlers.handleDeleteSelectedTask()}
          onSaveTask={handleSaveTask}
          onSaveCalendarEvent={handleSaveCalendarEvent}
          onStartTimer={(taskId) => void onStartTimer(taskId)}
          onStartEventTimer={(calendarEventId) => void onStartEventTimer(calendarEventId)}
          onStopTimer={() => void onStopTimer()}
          onSelectTimerTask={handleSelectTimelineTask}
        />
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragPayload ? <ActiveDragPreview payload={activeDragPayload} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function applyCopyIntent(payload: ActiveDragPayload, isAltPressed: boolean): ActiveDragPayload {
  if (!isAltPressed) return payload;
  if (payload.dragType === "queue-task") {
    return { dragType: "queue-task-copy", task: payload.task };
  }
  if (payload.dragType === "schedule-block") {
    return { dragType: "schedule-block-copy", scheduleBlock: payload.scheduleBlock, task: payload.task };
  }
  return payload;
}
