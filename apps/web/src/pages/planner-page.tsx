import { DndContext, pointerWithin } from "@dnd-kit/core";
import { PlannerDetailColumn, PlannerQueueColumn, PlannerTimelineColumn } from "@/features/planner/planner-page-columns";
import type { PlannerPageProps } from "@/features/planner/types";
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
    filteredQueueTasks,
    handleCreateTask,
    handleDismissCalendarEvent,
    handleDragEnd,
    handleSaveCalendarEvent,
    handleSaveTask,
    handleSelectCalendarEvent,
    handleSelectQueueTask,
    handleSelectTimelineTask,
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
  });

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={(event) => void handleDragEnd(event)}>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <PlannerQueueColumn
          createTaskForm={createTaskForm}
          totalTasks={dayPlan.tasks.length}
          isMutating={isMutating}
          togglSettings={togglSettings}
          search={search}
          selectedTaskId={plannerSelection.type === "queue-task" ? selectedTask?.id ?? null : null}
          tasks={filteredQueueTasks}
          onCreateTask={handleCreateTask}
          onSearchChange={setSearch}
          onSelectTask={handleSelectQueueTask}
          onDeleteTask={(taskId, title) => mutationHandlers.handleQueueTaskDelete(taskId, title)}
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
        />
      </div>
    </DndContext>
  );
}
