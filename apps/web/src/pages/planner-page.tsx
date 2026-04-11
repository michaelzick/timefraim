import { DndContext, PointerSensor, pointerWithin, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { ScheduleBlock, Task } from "@timefraim/shared";
import { useDeferredValue, useMemo, useRef, useState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { PlannerDetailColumn, PlannerQueueColumn, PlannerTimelineColumn } from "@/features/planner/planner-page-columns";
import { EMPTY_CREATE_TASK_VALUES, getTaskFormValues, resolvePlannerTaskStatus, showActionError, type LocalPlannerScheduleBlockUpdateInput, type LocalPlannerTaskInput, type LocalPlannerTaskUpdateInput, type PlannerCreateTaskValues, type PlannerSaveTaskValues } from "@/features/planner/planner-page-utils";
import { type CreateTaskValues, type PlannerPageProps, type TaskFormValues } from "@/features/planner/types";

export function PlannerPage({
  date,
  dayPlan,
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
  onStopTimer,
  onSyncCalendar,
  isSyncing,
  isMutating,
}: PlannerPageProps) {
  const createTask = onCreateTask as (values: LocalPlannerTaskInput) => Promise<unknown>;
  const updateTask = onUpdateTask as (taskId: string, values: LocalPlannerTaskUpdateInput) => Promise<unknown>;
  const updateScheduleBlock = onUpdateScheduleBlock as (scheduleBlockId: string, values: LocalPlannerScheduleBlockUpdateInput) => Promise<unknown>;
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(dayPlan.tasks[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(search);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const createTaskForm = useForm<CreateTaskValues>({ defaultValues: EMPTY_CREATE_TASK_VALUES });
  const selectedTask = useMemo(
    () => dayPlan.tasks.find((task) => task.id === selectedTaskId) ?? dayPlan.tasks[0] ?? null,
    [dayPlan.tasks, selectedTaskId],
  );
  const detailFormValues = useMemo(() => getTaskFormValues(selectedTask), [selectedTask]);
  const detailForm = useForm<TaskFormValues>({ values: detailFormValues });

  const filteredQueueTasks = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return dayPlan.tasks.filter((task) => {
      if (task.scheduledBlockId !== null || task.status === "done" || task.status === "archived") {
        return false;
      }
      return !needle || [task.title, task.notes ?? ""].join(" ").toLowerCase().includes(needle);
    });
  }, [dayPlan.tasks, deferredSearch]);

  async function handleCreateTask(values: PlannerCreateTaskValues) {
    const taskInput: LocalPlannerTaskInput = {
      title: values.title,
      notes: values.notes || undefined,
      estimatedMinutes: Number(values.estimatedMinutes),
      priority: values.priority,
      status: "planned",
      plannerDate: date,
    };
    await createTask(taskInput);
    createTaskForm.reset(EMPTY_CREATE_TASK_VALUES);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const slotIso = event.over?.data.current?.slotIso as string | undefined;
    const dragType = event.active.data.current?.dragType as "queue-task" | "schedule-block" | undefined;

    if (!slotIso || !dragType) {
      return;
    }

    if (dragType === "queue-task") {
      const draggedTask = event.active.data.current?.task as Task | undefined;
      if (!draggedTask) {
        return;
      }

      const endAt = new Date(new Date(slotIso).getTime() + draggedTask.estimatedMinutes * 60000).toISOString();

      try {
        startTransition(() => setSelectedTaskId(draggedTask.id));
        await onCreateScheduleBlock({ taskId: draggedTask.id, startAt: slotIso, endAt, source: "manual" });
      } catch (error) {
        showActionError("Failed to schedule the task. Please try again.", error);
      }
      return;
    }

    const draggedBlock = event.active.data.current?.scheduleBlock as ScheduleBlock | undefined;
    if (!draggedBlock) {
      return;
    }

    const durationMs = new Date(draggedBlock.endAt).getTime() - new Date(draggedBlock.startAt).getTime();
    const endAt = new Date(new Date(slotIso).getTime() + durationMs).toISOString();
    if (slotIso === draggedBlock.startAt && endAt === draggedBlock.endAt) {
      return;
    }

    try {
      const scheduleBlockUpdate: LocalPlannerScheduleBlockUpdateInput = { startAt: slotIso, endAt };
      await updateScheduleBlock(draggedBlock.id, scheduleBlockUpdate);
    } catch (error) {
      showActionError("Failed to move the scheduled task. Please try again.", error);
    }
  }

  async function handleDeleteSelectedTask() {
    if (!selectedTask || !window.confirm(`Delete "${selectedTask.title}" and remove any scheduled block?`)) {
      return;
    }

    const selectedIndex = dayPlan.tasks.findIndex((task) => task.id === selectedTask.id);
    const remainingTasks = dayPlan.tasks.filter((task) => task.id !== selectedTask.id);
    const nextTask = remainingTasks[selectedIndex] ?? remainingTasks[selectedIndex - 1] ?? null;
    startTransition(() => setSelectedTaskId(nextTask?.id ?? null));

    try {
      await onDeleteTask(selectedTask.id);
    } catch (error) {
      showActionError("Failed to delete the task. Please try again.", error);
    }
  }

  function handleQueueTaskDelete(taskId: string, title: string) {
    if (!window.confirm(`Delete "${title}"?`)) {
      return;
    }

    void onDeleteTask(taskId).catch((error) => showActionError("Failed to delete the task. Please try again.", error));
  }

  function handleDismissTimelineEvent(calendarEventId: string, title: string) {
    if (!window.confirm(`Hide "${title}" from the planner timeline until it changes in Google Calendar?`)) {
      return;
    }

    void onDismissCalendarEvent(calendarEventId).catch((error) => {
      showActionError("Failed to dismiss the calendar event. Please try again.", error);
    });
  }

  function handleDeleteTimelineBlock(blockId: string, title: string) {
    if (!window.confirm(`Remove "${title}" from the timeline? The task will return to the queue.`)) {
      return;
    }

    void onDeleteScheduleBlock(blockId).catch((error) => {
      showActionError("Failed to remove the schedule block. Please try again.", error);
    });
  }

  function handleSelectTask(taskId: string) { setSelectedTaskId(taskId); detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }

  async function handleSaveTask(values: PlannerSaveTaskValues) {
    if (!selectedTask) {
      return;
    }

    const status = resolvePlannerTaskStatus(selectedTask, values.lifecycle, dayPlan.activeTimer?.taskId ?? null);

    try {
      const taskUpdate: LocalPlannerTaskUpdateInput = {
        title: values.title,
        notes: values.notes,
        estimatedMinutes: values.estimatedMinutes,
        priority: values.priority,
        status,
      };
      await updateTask(selectedTask.id, taskUpdate);
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
          search={search}
          selectedTaskId={selectedTask?.id ?? null}
          tasks={filteredQueueTasks}
          onCreateTask={handleCreateTask}
          onSearchChange={setSearch}
          onSelectTask={handleSelectTask}
          onDeleteTask={handleQueueTaskDelete}
        />
        <PlannerTimelineColumn
          date={date}
          dayPlan={dayPlan}
          isSyncing={isSyncing}
          onDateChange={onDateChange}
          onSyncCalendar={() => void onSyncCalendar()}
          onSelectTask={setSelectedTaskId}
          onDismissCalendarEvent={handleDismissTimelineEvent}
          onDeleteScheduleBlock={handleDeleteTimelineBlock}
        />
        <PlannerDetailColumn
          detailPanelRef={detailPanelRef}
          detailForm={detailForm}
          selectedTask={selectedTask}
          dayPlan={dayPlan}
          activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
          isMutating={isMutating}
          onDeleteTask={() => void handleDeleteSelectedTask()}
          onSaveTask={handleSaveTask}
          onStartTimer={(taskId) => void onStartTimer(taskId)}
          onStopTimer={() => void onStopTimer()}
          onConfirmDraft={(draftId) => void onConfirmDraft(draftId)}
          onRejectDraft={(draftId) => void onRejectDraft(draftId)}
        />
      </div>
    </DndContext>
  );
}
