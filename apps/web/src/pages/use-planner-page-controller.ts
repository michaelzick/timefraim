import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { filterQueueTasks, filterTasksByCategory, getSelectedCalendarEventId, resolveSelectedCalendarEvent, resolveTaskSelection, selectDoneTasks, type PlannerSelection, type SelectedTaskSource, type TaskCategoryFilter } from "@/features/planner/planner-page-selection";
import { EMPTY_CREATE_TASK_VALUES, getTaskFormValues, type LocalPlannerTaskInput } from "@/features/planner/planner-page-utils";
import { type CalendarEventFormValues, type CreateTaskValues, type PlannerPageProps, type PlannerScheduleBlockUpdateInput, type PlannerTaskUpdateInput, type TaskFormValues } from "@/features/planner/types";
import { useAltKey } from "@/hooks/use-alt-key";
import { createPlannerMutationHandlers } from "@/pages/planner-page-actions";
import { createPlannerPageHandlers } from "@/pages/planner-page-controller-handlers";
import { usePlannerSelectionSync } from "@/pages/use-planner-selection-sync";
import { usePlannerTaskDeepLink } from "@/pages/use-planner-task-deep-link";

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
  const updateTask = onUpdateTask as (taskId: string, values: PlannerTaskUpdateInput) => Promise<unknown>;
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
  const [categoryFilter, setCategoryFilter] = useState<TaskCategoryFilter>("all");
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
  const filteredQueueTasks = useMemo(
    () => filterQueueTasks(dayPlan.tasks, deferredSearch, categoryFilter),
    [dayPlan.tasks, deferredSearch, categoryFilter],
  );
  const filteredTimelineTasks = useMemo(
    () => filterTasksByCategory(dayPlan.tasks, categoryFilter),
    [dayPlan.tasks, categoryFilter],
  );
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
  const selectedTask =
    plannerSelection.type === "queue-task" || plannerSelection.type === "timeline-task"
      ? resolvedTaskSelection.selectedTask
      : null;
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
  usePlannerTaskDeepLink({ dayPlan, detailPanelRef, plannerSelection, setPlannerSelection, setSelectedTaskState });

  const { handleClearSelection } = usePlannerSelectionSync({
    plannerSelection,
    resolvedSelectedTaskId: resolvedTaskSelection.selectedTaskId,
    resolvedSelectedTaskSource: resolvedTaskSelection.selectedTaskSource,
    selectedTaskState,
    setSelectedTaskState,
    setPlannerSelection,
  });

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
    selectedTaskState,
    selectedCalendarEvent,
    selectedTask,
    setPlannerSelection,
    setSelectedTaskState,
    updateScheduleBlock,
    updateTask,
    detailForm,
  });

  return {
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
  };
}
