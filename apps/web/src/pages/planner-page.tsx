import { DndContext, PointerSensor, pointerWithin, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { PlannerDetailColumn, PlannerQueueColumn, PlannerTimelineColumn } from "@/features/planner/planner-page-columns";
import {
  filterQueueTasks,
  getSelectedCalendarEventId,
  getSelectedTaskId,
  handlePlannerDragEnd,
  resolveSelectedCalendarEvent,
  resolveTaskSelection,
  type PlannerSelection,
  type SelectedTaskSource,
} from "@/features/planner/planner-page-selection";
import { EMPTY_CREATE_TASK_VALUES, getTaskFormValues, showActionError, type LocalPlannerTaskInput, type LocalPlannerTaskUpdateInput, type PlannerCreateTaskValues, type PlannerSaveTaskValues } from "@/features/planner/planner-page-utils";
import { type CreateTaskValues, type PlannerPageProps, type PlannerScheduleBlockUpdateInput, type TaskFormValues } from "@/features/planner/types";
import {
  buildPlannerCreateTaskInput,
  buildPlannerTaskUpdateInput,
  createPlannerMutationHandlers,
} from "@/pages/planner-page-actions";

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
  onConfirmDraft,
  onRejectDraft,
  onStartTimer,
  onStartEventTimer,
  onStopTimer,
  onSyncCalendar,
  isSyncing,
  isMutating,
}: PlannerPageProps) {
  const createTask = onCreateTask as (values: LocalPlannerTaskInput) => Promise<unknown>;
  const updateTask = onUpdateTask as (taskId: string, values: LocalPlannerTaskUpdateInput) => Promise<unknown>;
  const updateScheduleBlock = onUpdateScheduleBlock as (scheduleBlockId: string, values: PlannerScheduleBlockUpdateInput) => Promise<unknown>;
  const [selectedTaskState, setSelectedTaskState] = useState<{
    taskId: string | null;
    source: SelectedTaskSource;
  }>(() => ({
    taskId: filterQueueTasks(dayPlan.tasks, "")[0]?.id ?? null,
    source: "queue",
  }));
  const [plannerSelection, setPlannerSelection] = useState<PlannerSelection>(() => {
    const firstQueue = filterQueueTasks(dayPlan.tasks, "")[0];
    return firstQueue ? { type: "queue-task", taskId: firstQueue.id } : { type: "none" };
  });
  const [search, setSearch] = useState("");
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(search);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const createTaskForm = useForm<CreateTaskValues>({ defaultValues: EMPTY_CREATE_TASK_VALUES });
  const filteredQueueTasks = useMemo(() => {
    return filterQueueTasks(dayPlan.tasks, deferredSearch);
  }, [dayPlan.tasks, deferredSearch]);
  const resolvedTaskSelection = useMemo(
    () =>
      resolveTaskSelection({
        tasks: dayPlan.tasks,
        queueTasks: filteredQueueTasks,
        selectedTaskId: selectedTaskState.taskId,
        selectedTaskSource: selectedTaskState.source,
      }),
    [dayPlan.tasks, filteredQueueTasks, selectedTaskState.taskId, selectedTaskState.source],
  );
  const selectedTask = plannerSelection.type === "calendar-event" ? null : resolvedTaskSelection.selectedTask;
  const selectedCalendarEvent = resolveSelectedCalendarEvent(plannerSelection, dayPlan.calendarEvents);
  const mutationHandlers = createPlannerMutationHandlers({
    selectedTask,
    onDeleteTask,
    onDismissCalendarEvent,
    onDeleteScheduleBlock,
  });
  const detailFormValues = useMemo(() => getTaskFormValues(selectedTask), [selectedTask]);
  const detailForm = useForm<TaskFormValues>({ values: detailFormValues });

  const selectedTimelineTaskId = plannerSelection.type === "timeline-task" ? plannerSelection.taskId : null;
  const selectedTimelineCalendarEventId = getSelectedCalendarEventId(plannerSelection);

  useEffect(() => {
    if (plannerSelection.type === "calendar-event") {
      return;
    }

    if (
      selectedTaskState.taskId === resolvedTaskSelection.selectedTaskId &&
      selectedTaskState.source === resolvedTaskSelection.selectedTaskSource
    ) {
      return;
    }

    startTransition(() => {
      setSelectedTaskState({
        taskId: resolvedTaskSelection.selectedTaskId,
        source: resolvedTaskSelection.selectedTaskSource,
      });
    });
  }, [
    plannerSelection.type,
    resolvedTaskSelection.selectedTaskId,
    resolvedTaskSelection.selectedTaskSource,
    selectedTaskState.source,
    selectedTaskState.taskId,
  ]);

  async function handleCreateTask(values: PlannerCreateTaskValues) {
    await createTask(buildPlannerCreateTaskInput(values, date));
    createTaskForm.reset(EMPTY_CREATE_TASK_VALUES);
  }

  async function handleDragEnd(event: DragEndEvent) {
    await handlePlannerDragEnd({
      event,
      onCreateScheduleBlock,
      onUpdateScheduleBlock: updateScheduleBlock,
      onQueueTaskSelected: (taskId) => {
        setSelectedTaskState({ taskId, source: "timeline" });
        setPlannerSelection({ type: "timeline-task", taskId });
      },
      onQueueTaskReset: (taskId) => {
        setSelectedTaskState({ taskId, source: "queue" });
        setPlannerSelection({ type: "queue-task", taskId });
      },
      onError: showActionError,
    });
  }

  function handleSelectQueueTask(taskId: string) {
    startTransition(() => {
      setSelectedTaskState({ taskId, source: "queue" });
      setPlannerSelection({ type: "queue-task", taskId });
    });
    detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function handleSelectTimelineTask(taskId: string) {
    startTransition(() => {
      setSelectedTaskState({ taskId, source: "timeline" });
      setPlannerSelection({ type: "timeline-task", taskId });
    });
  }

  function handleSelectCalendarEvent(calendarEventId: string) {
    startTransition(() => {
      setPlannerSelection({ type: "calendar-event", calendarEventId });
    });
  }

  async function handleSaveTask(values: PlannerSaveTaskValues) {
    if (!selectedTask) {
      return;
    }

    try {
      await updateTask(selectedTask.id, buildPlannerTaskUpdateInput(selectedTask, values, dayPlan.activeTimer?.taskId ?? null));
    } catch (error) {
      showActionError("Failed to save the task. Please try again.", error);
    }
  }

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
          onDismissCalendarEvent={(calendarEventId, title) => mutationHandlers.handleDismissTimelineEvent(calendarEventId, title)}
          onDeleteScheduleBlock={(blockId, title) => mutationHandlers.handleDeleteTimelineBlock(blockId, title)}
        />
        <PlannerDetailColumn
          detailPanelRef={detailPanelRef}
          detailForm={detailForm}
          selectedTask={selectedTask}
          selectedCalendarEvent={selectedCalendarEvent}
          dayPlan={dayPlan}
          activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
          activeTimerCalendarEventId={dayPlan.activeTimer?.calendarEventId ?? null}
          isMutating={isMutating}
          togglSettings={togglSettings}
          onDeleteTask={() => void mutationHandlers.handleDeleteSelectedTask()}
          onSaveTask={handleSaveTask}
          onStartTimer={(taskId) => void onStartTimer(taskId)}
          onStartEventTimer={(calendarEventId) => void onStartEventTimer(calendarEventId)}
          onStopTimer={() => void onStopTimer()}
          onConfirmDraft={(draftId) => void onConfirmDraft(draftId)}
          onRejectDraft={(draftId) => void onRejectDraft(draftId)}
        />
      </div>
    </DndContext>
  );
}
