import { DndContext, DragOverlay, pointerWithin, type DragStartEvent } from "@dnd-kit/core";
import { useState, type MouseEvent } from "react";
import { ActiveDragPreview, type ActiveDragPayload } from "@/features/planner/active-drag-preview";
import { PlannerDetailColumn, PlannerQueueColumn, PlannerTimelineColumn } from "@/features/planner/planner-page-columns";
import { PlannerToolbar } from "@/features/planner/planner-toolbar";
import type { PlannerPageProps } from "@/features/planner/types";
import { usePlannerKeyboardShortcuts } from "@/pages/use-planner-keyboard-shortcuts";
import { usePlannerPageController } from "@/pages/use-planner-page-controller";

export function PlannerPage({
  date,
  dayPlan,
  linkedGoogleEmail,
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
    categoryFilter,
    createTaskForm,
    detailForm,
    detailPanelRef,
    doneTasks,
    filteredQueueTasks,
    filteredTimelineTasks,
    handleCreateTask,
    handleDismissCalendarEvent,
    handleDragEnd,
    handleClearSelection,
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
    setCategoryFilter,
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

  const handlePlannerSurfaceClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest(
        "[data-planner-selectable='true'], [data-planner-detail-panel='true'], [data-planner-preserve-selection='true']",
      )
    ) {
      return;
    }
    handleClearSelection();
  };

  const activeDragPayload = activeDrag ? applyCopyIntent(activeDrag, isAltPressed) : null;
  const copyDragTaskId = activeDrag?.dragType === "queue-task" && isAltPressed ? activeDrag.task.id : null;
  const copyDragScheduleBlockId =
    activeDrag?.dragType === "schedule-block" && isAltPressed ? activeDrag.scheduleBlock.id : null;

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
      <div className="space-y-6" onClick={handlePlannerSurfaceClick}>
        <PlannerToolbar
          date={date}
          isSyncing={isSyncing}
          calendarSync={dayPlan.calendarSync}
          linkedGoogleEmail={linkedGoogleEmail}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          onDateChange={onDateChange}
          onSyncCalendar={() => void onSyncCalendar()}
        />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <PlannerQueueColumn
            createTaskForm={createTaskForm}
            isMutating={isMutating}
            togglSettings={togglSettings}
            selectedTaskId={plannerSelection.type === "queue-task" ? selectedTask?.id ?? null : null}
            activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
            copyDragTaskId={copyDragTaskId}
            search={search}
            tasks={filteredQueueTasks}
            onSearchChange={setSearch}
            onCreateTask={handleCreateTask}
            onSelectTask={handleSelectQueueTask}
            onDeleteTask={(taskId, title) => mutationHandlers.handleQueueTaskDelete(taskId, title)}
            onDuplicateTask={(task) => mutationHandlers.handleDuplicateTask(task)}
            onStartTaskTimer={(taskId) => mutationHandlers.handleStartTaskTimer(taskId)}
          />
          <PlannerTimelineColumn
            date={date}
            dayPlan={dayPlan}
            tasks={filteredTimelineTasks}
            selectedTimelineTaskId={selectedTimelineTaskId}
            selectedTimelineCalendarEventId={selectedTimelineCalendarEventId}
            copyDragScheduleBlockId={copyDragScheduleBlockId}
            onSelectTask={handleSelectTimelineTask}
            onSelectCalendarEvent={handleSelectCalendarEvent}
            onDismissCalendarEvent={(calendarEventId, title) => void handleDismissCalendarEvent(calendarEventId, title)}
            onDeleteScheduleBlock={(blockId, title) => mutationHandlers.handleDeleteTimelineBlock(blockId, title)}
            onDuplicateTask={(task) => mutationHandlers.handleDuplicateTask(task)}
            onStartTaskTimer={(taskId) => mutationHandlers.handleStartTaskTimer(taskId)}
            onMarkTaskDone={(task) => mutationHandlers.handleMarkTaskDone(task)}
            onResizeTaskDuration={(task, durationMinutes) =>
              mutationHandlers.handleResizeTaskDuration(task, durationMinutes)}
          />
          <PlannerDetailColumn
            detailPanelRef={detailPanelRef}
            detailForm={detailForm}
            calendarEventForm={calendarEventForm}
            selectedTask={selectedTask}
            selectedCalendarEvent={selectedCalendarEvent}
            dayPlan={dayPlan}
            doneTasks={doneTasks}
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
            onReactivateDoneTask={(task) => mutationHandlers.handleReactivateDoneTask(task)}
          />
        </div>
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
