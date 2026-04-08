import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { Task } from "@timefraim/shared";
import { useDeferredValue, useMemo, useRef, useState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { PlannerActivityCard } from "@/features/planner/planner-activity-card";
import { CreateTaskCard } from "@/features/planner/create-task-card";
import { PlannerSummaryCard } from "@/features/planner/planner-summary-card";
import { TaskDetailCard } from "@/features/planner/task-detail-card";
import { TaskQueueCard } from "@/features/planner/task-queue-card";
import { type CreateTaskValues, type PlannerPageProps, type TaskFormValues } from "@/features/planner/types";
import { TimelineBoard } from "@/components/timeline-board";

function showActionError(message: string, error: unknown) {
  console.error(message, error);
  window.alert(message);
}

export function PlannerPage({
  date,
  dayPlan,
  onDateChange,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreateScheduleBlock,
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(dayPlan.tasks[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(search);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const createTaskForm = useForm<CreateTaskValues>({
    defaultValues: { title: "", notes: "", estimatedMinutes: 30, status: "inbox" },
  });
  const selectedTask = useMemo(
    () => dayPlan.tasks.find((task) => task.id === selectedTaskId) ?? dayPlan.tasks[0] ?? null,
    [dayPlan.tasks, selectedTaskId],
  );
  const detailForm = useForm<TaskFormValues>({
    values: selectedTask
      ? {
          title: selectedTask.title,
          notes: selectedTask.notes ?? "",
          estimatedMinutes: selectedTask.estimatedMinutes,
          status: selectedTask.status,
        }
      : { title: "", notes: "", estimatedMinutes: 30, status: "inbox" },
  });

  const filteredQueueTasks = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return dayPlan.tasks.filter((task) => {
      if (task.scheduledBlockId !== null || task.status === "done" || task.status === "archived") {
        return false;
      }
      return !needle || [task.title, task.notes ?? ""].join(" ").toLowerCase().includes(needle);
    });
  }, [dayPlan.tasks, deferredSearch]);

  async function handleCreateTask(values: CreateTaskValues) {
    await onCreateTask({
      title: values.title,
      notes: values.notes || undefined,
      estimatedMinutes: Number(values.estimatedMinutes),
      status: values.status,
    });
    createTaskForm.reset({ title: "", notes: "", estimatedMinutes: 30, status: "inbox" });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const slotIso = event.over?.data.current?.slotIso as string | undefined;
    const draggedTask = event.active.data.current?.task as Task | undefined;
    if (!slotIso || !draggedTask) {
      return;
    }

    const endAt = new Date(new Date(slotIso).getTime() + draggedTask.estimatedMinutes * 60000).toISOString();
    startTransition(() => setSelectedTaskId(draggedTask.id));
    await onCreateScheduleBlock({ taskId: draggedTask.id, startAt: slotIso, endAt, source: "manual" });
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

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={(event) => void handleDragEnd(event)}>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <CreateTaskCard
            form={createTaskForm}
            totalTasks={dayPlan.tasks.length}
            isMutating={isMutating}
            onSubmit={handleCreateTask}
          />
          <TaskQueueCard
            search={search}
            selectedTaskId={selectedTask?.id ?? null}
            tasks={filteredQueueTasks}
            onSearchChange={setSearch}
            onSelectTask={handleSelectTask}
            onDeleteTask={(taskId, title) => {
              if (!window.confirm(`Delete "${title}"?`)) {
                return;
              }
              void onDeleteTask(taskId).catch((error) => showActionError("Failed to delete the task. Please try again.", error));
            }}
          />
        </div>

        <div className="space-y-6">
          <PlannerSummaryCard
            date={date}
            integrationStatus={dayPlan.integrationStatus}
            isSyncing={isSyncing}
            onDateChange={onDateChange}
            onSyncCalendar={onSyncCalendar}
          />
          <TimelineBoard
            date={date}
            tasks={dayPlan.tasks}
            scheduleBlocks={dayPlan.scheduleBlocks}
            calendarEvents={dayPlan.calendarEvents}
            onSelectTask={setSelectedTaskId}
            onDismissCalendarEvent={(calendarEventId, title) => {
              if (!window.confirm(`Hide "${title}" from the planner timeline until it changes in Google Calendar?`)) {
                return;
              }
              void onDismissCalendarEvent(calendarEventId).catch((error) => {
                showActionError("Failed to dismiss the calendar event. Please try again.", error);
              });
            }}
            onDeleteScheduleBlock={(blockId, title) => {
              if (!window.confirm(`Remove "${title}" from the timeline? The task will return to the queue.`)) {
                return;
              }
              void onDeleteScheduleBlock(blockId).catch((error) => {
                showActionError("Failed to remove the schedule block. Please try again.", error);
              });
            }}
          />
        </div>

        <div className="space-y-6">
          <TaskDetailCard
            detailPanelRef={detailPanelRef}
            form={detailForm}
            selectedTask={selectedTask}
            activeTimerTaskId={dayPlan.activeTimer?.taskId ?? null}
            isMutating={isMutating}
            onDeleteTask={() => void handleDeleteSelectedTask()}
            onSaveTask={async (values) => {
              if (!selectedTask) {
                return;
              }
              try {
                await onUpdateTask(selectedTask.id, values);
              } catch (error) {
                showActionError("Failed to save the task. Please try again.", error);
              }
            }}
            onStartTimer={(taskId) => void onStartTimer(taskId)}
            onStopTimer={() => void onStopTimer()}
          />
          <PlannerActivityCard
            dayPlan={dayPlan}
            onConfirmDraft={(draftId) => void onConfirmDraft(draftId)}
            onRejectDraft={(draftId) => void onRejectDraft(draftId)}
            onStopTimer={() => void onStopTimer()}
          />
        </div>
      </div>
    </DndContext>
  );
}
