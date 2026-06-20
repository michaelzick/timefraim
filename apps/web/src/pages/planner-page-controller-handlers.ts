import type { PlannerDuplicateResult } from "@timefraim/shared";
import { startTransition, type MutableRefObject, type RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { type PlannerSelection, type SelectedTaskSource } from "@/features/planner/planner-page-selection";
import { EMPTY_CREATE_TASK_VALUES, showActionError, type PlannerCreateTaskValues, type PlannerSaveTaskValues } from "@/features/planner/planner-page-utils";
import { type CalendarEventFormValues, type CreateTaskValues, type PlannerScheduleBlockUpdateInput, type TaskFormValues } from "@/features/planner/types";
import { buildCalendarEventUpdateInput, buildPlannerCreateTaskInput, buildPlannerTaskUpdateInput, confirmTimelineEventDismiss } from "@/pages/planner-page-actions";
import { createPlannerDragEndHandler } from "@/pages/planner-drag-end-handler";

export function createPlannerPageHandlers(args: {
  createTask: (values: ReturnType<typeof buildPlannerCreateTaskInput>) => Promise<unknown>;
  createTaskForm: UseFormReturn<CreateTaskValues>;
  date: string;
  detailPanelRef: RefObject<HTMLDivElement | null>;
  isAltPressedRef: MutableRefObject<boolean>;
  onCreateScheduleBlock: (values: {
    taskId: string;
    startAt: string;
    endAt: string;
    source: "manual";
    plannerDate?: string;
    tzOffsetMinutes?: number;
  }) => Promise<unknown>;
  onDeleteScheduleBlock: (scheduleBlockId: string) => Promise<unknown>;
  onDeleteTask: (taskId: string) => Promise<unknown>;
  onDismissCalendarEvent: (calendarEventId: string) => Promise<unknown>;
  onDuplicateTask: (
    taskId: string,
    body?: { startAt?: string; endAt?: string; plannerDate?: string; tzOffsetMinutes?: number },
  ) => Promise<PlannerDuplicateResult>;
  onDuplicateScheduleBlock: (
    scheduleBlockId: string,
    body: { startAt: string; endAt: string; plannerDate?: string; tzOffsetMinutes?: number },
  ) => Promise<PlannerDuplicateResult>;
  onUpdateCalendarEvent: (
    calendarEventId: string,
    values: ReturnType<typeof buildCalendarEventUpdateInput>,
  ) => Promise<unknown>;
  plannerSelection: PlannerSelection;
  resolvedTaskSelection: {
    selectedTaskId: string | null;
    selectedTaskSource: SelectedTaskSource;
  };
  selectedTaskState: {
    taskId: string | null;
    source: SelectedTaskSource;
  };
  selectedCalendarEvent: { id: string } | null;
  selectedTask: Parameters<typeof buildPlannerTaskUpdateInput>[0] | null;
  setPlannerSelection: (selection: PlannerSelection) => void;
  setSelectedTaskState: (state: {
    taskId: string | null;
    source: SelectedTaskSource;
  }) => void;
  updateScheduleBlock: (
    scheduleBlockId: string,
    values: PlannerScheduleBlockUpdateInput,
  ) => Promise<unknown>;
  updateTask: (
    taskId: string,
    values: ReturnType<typeof buildPlannerTaskUpdateInput>,
  ) => Promise<unknown>;
  detailForm: UseFormReturn<TaskFormValues>;
}) {
  async function handleCreateTask(values: PlannerCreateTaskValues) {
    try {
      await args.createTask(buildPlannerCreateTaskInput(values, args.date));
      args.createTaskForm.reset(EMPTY_CREATE_TASK_VALUES);
    } catch (error) {
      showActionError("Failed to create the task. Please try again.", error);
    }
  }

  const handleDragEnd = createPlannerDragEndHandler({
    date: args.date,
    isAltPressedRef: args.isAltPressedRef,
    onCreateScheduleBlock: args.onCreateScheduleBlock,
    onDeleteScheduleBlock: args.onDeleteScheduleBlock,
    onDeleteTask: args.onDeleteTask,
    onDuplicateTask: args.onDuplicateTask,
    onDuplicateScheduleBlock: args.onDuplicateScheduleBlock,
    updateScheduleBlock: args.updateScheduleBlock,
    setPlannerSelection: args.setPlannerSelection,
    setSelectedTaskState: args.setSelectedTaskState,
  });

  function handleSelectQueueTask(taskId: string) {
    startTransition(() => {
      args.setSelectedTaskState({ taskId, source: "queue" });
      args.setPlannerSelection({ type: "queue-task", taskId });
    });
    args.detailPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function handleSelectTimelineTask(taskId: string) {
    startTransition(() => {
      args.setSelectedTaskState({ taskId, source: "timeline" });
      args.setPlannerSelection({ type: "timeline-task", taskId });
    });
  }

  function handleSelectCalendarEvent(calendarEventId: string) {
    startTransition(() => {
      args.setPlannerSelection({ type: "calendar-event", calendarEventId });
    });
  }

  function buildFallbackPlannerSelection(): PlannerSelection {
    if (!args.selectedTaskState.taskId || !args.resolvedTaskSelection.selectedTaskId) {
      return { type: "none" };
    }

    return args.resolvedTaskSelection.selectedTaskSource === "timeline"
      ? { type: "timeline-task", taskId: args.resolvedTaskSelection.selectedTaskId }
      : { type: "queue-task", taskId: args.resolvedTaskSelection.selectedTaskId };
  }

  async function handleDismissCalendarEvent(
    calendarEventId: string,
    title: string,
  ) {
    if (!confirmTimelineEventDismiss(title)) {
      return;
    }

    const dismissedSelectionWasActive =
      args.plannerSelection.type === "calendar-event" &&
      args.plannerSelection.calendarEventId === calendarEventId;
    const previousSelection = dismissedSelectionWasActive
      ? args.plannerSelection
      : null;

    if (dismissedSelectionWasActive) {
      startTransition(() => {
        args.setPlannerSelection(buildFallbackPlannerSelection());
      });
    }

    try {
      await args.onDismissCalendarEvent(calendarEventId);
    } catch (error) {
      if (previousSelection) {
        startTransition(() => {
          args.setPlannerSelection(previousSelection);
        });
      }
      showActionError(
        "Failed to dismiss the calendar event. Please try again.",
        error,
      );
    }
  }

  async function handleSaveTask(values: PlannerSaveTaskValues) {
    if (!args.selectedTask) {
      return;
    }

    try {
      await args.updateTask(
        args.selectedTask.id,
        buildPlannerTaskUpdateInput(args.selectedTask, values),
      );
      args.detailForm.reset(values as TaskFormValues);
    } catch (error) {
      showActionError("Failed to save the task. Please try again.", error);
    }
  }

  async function handleSaveCalendarEvent(values: CalendarEventFormValues) {
    if (!args.selectedCalendarEvent) {
      return;
    }

    try {
      await args.onUpdateCalendarEvent(
        args.selectedCalendarEvent.id,
        buildCalendarEventUpdateInput(values),
      );
    } catch (error) {
      showActionError("Failed to save the calendar event. Please try again.", error);
    }
  }

  return {
    handleCreateTask,
    handleDismissCalendarEvent,
    handleDragEnd,
    handleSaveCalendarEvent,
    handleSaveTask,
    handleSelectCalendarEvent,
    handleSelectQueueTask,
    handleSelectTimelineTask,
  };
}
