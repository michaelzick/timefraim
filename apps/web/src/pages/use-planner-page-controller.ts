import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { filterQueueTasks, getSelectedCalendarEventId, resolveSelectedCalendarEvent, resolveTaskSelection, selectDoneTasks, type PlannerSelection, type SelectedTaskSource } from "@/features/planner/planner-page-selection";
import { EMPTY_CREATE_TASK_VALUES, getTaskFormValues, type LocalPlannerTaskInput, type LocalPlannerTaskUpdateInput } from "@/features/planner/planner-page-utils";
import { type CalendarEventFormValues, type CreateTaskValues, type PlannerPageProps, type PlannerScheduleBlockUpdateInput, type TaskFormValues } from "@/features/planner/types";
import { useAltKey } from "@/hooks/use-alt-key";
import { createPlannerMutationHandlers } from "@/pages/planner-page-actions";
import { createPlannerPageHandlers } from "@/pages/planner-page-controller-handlers";

export function usePlannerPageController({
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
}: Pick<
  PlannerPageProps,
  | "date"
  | "dayPlan"
  | "onCreateTask"
  | "onUpdateTask"
  | "onDeleteTask"
  | "onCreateScheduleBlock"
  | "onUpdateScheduleBlock"
  | "onDeleteScheduleBlock"
  | "onDismissCalendarEvent"
  | "onUpdateCalendarEvent"
  | "onDuplicateTask"
  | "onDuplicateScheduleBlock"
  | "onStartTimer"
>) {
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const { isAltPressed, isAltPressedRef } = useAltKey();

  const createTaskForm = useForm<CreateTaskValues>({
    defaultValues: EMPTY_CREATE_TASK_VALUES,
    mode: "onChange",
  });
  const filteredQueueTasks = useMemo(() => filterQueueTasks(dayPlan.tasks, deferredSearch), [dayPlan.tasks, deferredSearch]);
  const doneTasks = useMemo(() => selectDoneTasks(dayPlan.tasks, date), [dayPlan.tasks, date]);
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
    date,
    onDeleteTask,
    onDeleteScheduleBlock,
    onUpdateTask: updateTask,
    onDuplicateTask,
    onStartTimer,
  });
  const detailFormValues = useMemo(() => getTaskFormValues(selectedTask), [selectedTask]);
  const detailForm = useForm<TaskFormValues>({ values: detailFormValues });
  const calendarEventFormValues = useMemo<CalendarEventFormValues>(
    () => ({ togglProjectId: selectedCalendarEvent?.togglProjectId ?? "" }),
    [selectedCalendarEvent?.togglProjectId],
  );
  const calendarEventForm = useForm<CalendarEventFormValues>({ values: calendarEventFormValues });

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

  const {
    handleCreateTask,
    handleDismissCalendarEvent,
    handleDragEnd,
    handleSaveCalendarEvent,
    handleSaveTask,
    handleSelectCalendarEvent,
    handleSelectQueueTask,
    handleSelectTimelineTask,
  } = createPlannerPageHandlers({
    createTask,
    createTaskForm,
    date,
    detailPanelRef,
    isAltPressedRef,
    onCreateScheduleBlock,
    onDeleteScheduleBlock,
    onDeleteTask,
    onDismissCalendarEvent,
    onDuplicateTask,
    onDuplicateScheduleBlock,
    onUpdateCalendarEvent,
    plannerSelection,
    resolvedTaskSelection,
    selectedCalendarEvent,
    selectedTask,
    setPlannerSelection,
    setSelectedTaskState,
    updateScheduleBlock,
    updateTask,
    activeTimerTaskId: dayPlan.activeTimer?.taskId ?? null,
    detailForm,
  });

  return {
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
  };
}
