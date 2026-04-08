import * as Tabs from "@radix-ui/react-tabs";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { DayPlan, Task } from "@timefraim/shared";
import { useDeferredValue, useMemo, useRef, useState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { BellRing, CalendarClock, Hourglass, LoaderCircle, Play, RefreshCcw, Sparkles, Square, Trash2 } from "lucide-react";
import { TaskPill } from "@/components/task-pill";
import { TimelineBoard } from "@/components/timeline-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { formatTime } from "@/lib/utils";

type TaskFormValues = {
  title: string;
  notes: string;
  estimatedMinutes: number;
  status: Task["status"];
};

type CreateTaskValues = {
  title: string;
  notes: string;
  estimatedMinutes: number;
  status: Task["status"];
};

const STATUS_OPTIONS: Task["status"][] = [
  "inbox",
  "planned",
  "scheduled",
  "in_progress",
  "done",
  "archived",
];

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
}: {
  date: string;
  dayPlan: DayPlan;
  onDateChange: (nextDate: string) => void;
  onCreateTask: (values: { title: string; notes?: string; estimatedMinutes: number; status: Task["status"] }) => Promise<void>;
  onUpdateTask: (taskId: string, values: Partial<TaskFormValues>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onCreateScheduleBlock: (values: { taskId: string; startAt: string; endAt: string; source: "manual" }) => Promise<void>;
  onDeleteScheduleBlock: (scheduleBlockId: string) => Promise<void>;
  onDismissCalendarEvent: (calendarEventId: string) => Promise<void>;
  onConfirmDraft: (draftId: string) => Promise<void>;
  onRejectDraft: (draftId: string) => Promise<void>;
  onStartTimer: (taskId: string) => Promise<void>;
  onStopTimer: () => Promise<void>;
  onSyncCalendar: () => Promise<void>;
  isSyncing: boolean;
  isMutating: boolean;
}) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(dayPlan.tasks[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(search);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const createTaskForm = useForm<CreateTaskValues>({
    defaultValues: {
      title: "",
      notes: "",
      estimatedMinutes: 30,
      status: "inbox" as Task["status"],
    },
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
      : {
          title: "",
          notes: "",
          estimatedMinutes: 30,
          status: "inbox",
        },
  });

  const queueTasks = useMemo(
    () =>
      dayPlan.tasks.filter(
        (task) => task.scheduledBlockId === null && task.status !== "done" && task.status !== "archived",
      ),
    [dayPlan.tasks],
  );

  const filteredQueueTasks = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return queueTasks.filter((task) => {
      if (!needle) {
        return true;
      }
      return [task.title, task.notes ?? ""].join(" ").toLowerCase().includes(needle);
    });
  }, [deferredSearch, queueTasks]);

  async function handleCreateTask(values: CreateTaskValues) {
    await onCreateTask({
      title: values.title,
      notes: values.notes || undefined,
      estimatedMinutes: Number(values.estimatedMinutes),
      status: values.status,
    });
    createTaskForm.reset({
      title: "",
      notes: "",
      estimatedMinutes: 30,
      status: "inbox",
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const slotIso = event.over?.data.current?.slotIso as string | undefined;
    const draggedTask = event.active.data.current?.task as Task | undefined;

    if (!slotIso || !draggedTask) {
      return;
    }

    const endAt = new Date(new Date(slotIso).getTime() + draggedTask.estimatedMinutes * 60000).toISOString();
    startTransition(() => {
      setSelectedTaskId(draggedTask.id);
    });
    await onCreateScheduleBlock({
      taskId: draggedTask.id,
      startAt: slotIso,
      endAt,
      source: "manual",
    });
  }

  async function handleDeleteTask() {
    if (!selectedTask || !window.confirm(`Delete "${selectedTask.title}" and remove any scheduled block?`)) {
      return;
    }

    const selectedIndex = dayPlan.tasks.findIndex((task) => task.id === selectedTask.id);
    const remainingTasks = dayPlan.tasks.filter((task) => task.id !== selectedTask.id);
    const nextTask = remainingTasks[selectedIndex] ?? remainingTasks[selectedIndex - 1] ?? null;

    startTransition(() => {
      setSelectedTaskId(nextTask?.id ?? null);
    });
    try {
      await onDeleteTask(selectedTask.id);
    } catch (error) {
      console.error("Failed to delete task:", error);
      window.alert("Failed to delete the task. Please try again.");
    }
  }

  async function handleDismissCalendarEvent(calendarEventId: string, title: string) {
    if (!window.confirm(`Hide "${title}" from the planner timeline until it changes in Google Calendar?`)) {
      return;
    }

    try {
      await onDismissCalendarEvent(calendarEventId);
    } catch (error) {
      console.error("Failed to dismiss calendar event:", error);
      window.alert("Failed to dismiss the calendar event. Please try again.");
    }
  }

  async function handleDeleteScheduleBlock(scheduleBlockId: string, title: string) {
    if (!window.confirm(`Remove "${title}" from the timeline? The task will return to the queue.`)) {
      return;
    }
    try {
      await onDeleteScheduleBlock(scheduleBlockId);
    } catch (error) {
      console.error("Failed to remove schedule block:", error);
      window.alert("Failed to remove the schedule block. Please try again.");
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={(event) => void handleDragEnd(event)}>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Capture</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Task inbox</h2>
            </div>
            <Badge>{dayPlan.tasks.length} total</Badge>
          </div>
          <form
            className="space-y-3"
            onSubmit={createTaskForm.handleSubmit(handleCreateTask)}
          >
            <Input placeholder="Next commitment" {...createTaskForm.register("title")} />
            <Textarea
              placeholder="Why this matters right now"
              className="min-h-24"
              {...createTaskForm.register("notes")}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={5}
                step={5}
                {...createTaskForm.register("estimatedMinutes", { valueAsNumber: true })}
              />
              <select
                className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)]"
                {...createTaskForm.register("status")}
              >
                {STATUS_OPTIONS.slice(0, 4).map((status) => (
                  <option key={status} value={status} className="bg-[var(--panel)]">
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={isMutating}>
              {isMutating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Add task
            </Button>
          </form>
        </Card>

        <Card className="min-h-[520px]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Queue</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Tasks ready to place</h2>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter tasks"
              className="max-w-[160px]"
            />
          </div>
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-3">
              {filteredQueueTasks.map((task) => (
                <TaskPill
                  key={task.id}
                  task={task}
                  active={selectedTask?.id === task.id}
                  onSelect={() => {
                    setSelectedTaskId(task.id);
                    detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }}
                  onDelete={() => {
                    if (!window.confirm(`Delete "${task.title}"?`)) {
                      return;
                    }
                    onDeleteTask(task.id).catch((error) => {
                      console.error("Failed to delete task:", error);
                      window.alert("Failed to delete the task. Please try again.");
                    });
                  }}
                />
              ))}
            </div>
          </ScrollArea>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Daily planner</p>
              <h1 className="mt-1 text-3xl font-semibold text-white">Timebox the right work, then protect it.</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className="w-[180px]" />
              <Button variant="secondary" onClick={onSyncCalendar} disabled={isSyncing}>
                {isSyncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Sync calendar
              </Button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Badge>{dayPlan.integrationStatus.googleConnected ? "Google live" : "Google not connected"}</Badge>
            <Badge>{dayPlan.integrationStatus.togglConnected ? "Toggl live" : "Toggl not connected"}</Badge>
            <Badge>{dayPlan.integrationStatus.tunnelBaseUrl ? "Tunnel ready" : "Tunnel pending"}</Badge>
          </div>
          </Card>

          <TimelineBoard
            date={date}
            tasks={dayPlan.tasks}
            scheduleBlocks={dayPlan.scheduleBlocks}
            calendarEvents={dayPlan.calendarEvents}
            onDismissCalendarEvent={(calendarEventId, title) => void handleDismissCalendarEvent(calendarEventId, title)}
            onSelectTask={(taskId) => setSelectedTaskId(taskId)}
            onDeleteScheduleBlock={(blockId, title) => void handleDeleteScheduleBlock(blockId, title)}
          />
        </div>

        <div className="space-y-6">
          <Card ref={detailPanelRef}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Focus</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Task detail</h2>
            </div>
            <Badge>{selectedTask?.status.replace("_", " ") ?? "none"}</Badge>
          </div>
          {selectedTask ? (
            <form
              className="space-y-4"
              onSubmit={detailForm.handleSubmit(async (values) => {
                await onUpdateTask(selectedTask.id, values);
              })}
            >
              <Input {...detailForm.register("title")} />
              <Textarea {...detailForm.register("notes")} />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={5}
                  step={5}
                  {...detailForm.register("estimatedMinutes", { valueAsNumber: true })}
                />
                <select
                  className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)]"
                  {...detailForm.register("status")}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status} className="bg-[var(--panel)]">
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button type="submit" variant="secondary" disabled={isMutating}>
                  Save detail
                </Button>
                {dayPlan.activeTimer?.taskId === selectedTask.id ? (
                  <Button type="button" onClick={onStopTimer} disabled={isMutating}>
                    <Square className="h-4 w-4" />
                    Stop timer
                  </Button>
                ) : (
                  <Button type="button" onClick={() => onStartTimer(selectedTask.id)} disabled={isMutating}>
                    <Play className="h-4 w-4" />
                    Start timer
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full border-[rgba(255,111,59,0.28)] text-[var(--accent)] hover:bg-[rgba(255,111,59,0.12)]"
                onClick={() => void handleDeleteTask()}
                disabled={isMutating}
              >
                <Trash2 className="h-4 w-4" />
                Delete task
              </Button>
            </form>
          ) : (
            <p className="text-sm text-[var(--muted)]">Select a task to refine notes, status, and timers.</p>
          )}
          </Card>

          <Card>
            <Tabs.Root defaultValue="drafts">
            <Tabs.List className="mb-5 grid grid-cols-3 rounded-full border border-white/10 bg-white/5 p-1">
              <Tabs.Trigger className="rounded-full px-3 py-2 text-sm text-[var(--muted)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--surface)]" value="drafts">
                Drafts
              </Tabs.Trigger>
              <Tabs.Trigger className="rounded-full px-3 py-2 text-sm text-[var(--muted)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--surface)]" value="activity">
                Activity
              </Tabs.Trigger>
              <Tabs.Trigger className="rounded-full px-3 py-2 text-sm text-[var(--muted)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--surface)]" value="timer">
                Timer
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="drafts" className="space-y-3">
              {dayPlan.drafts.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No pending AI drafts. MCP proposals will land here for approval.</p>
              ) : (
                dayPlan.drafts.map((draft) => (
                  <div key={draft.id} className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Badge>{draft.actorRole}</Badge>
                      <span className="text-xs text-[var(--muted)]">{new Date(draft.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-white">{draft.diffSummary}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => void onConfirmDraft(draft.id)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => void onRejectDraft(draft.id)}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </Tabs.Content>

            <Tabs.Content value="activity" className="space-y-3">
              {dayPlan.auditLogs.map((entry) => (
                <div key={entry.id} className="rounded-[24px] border border-white/10 bg-white/4 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge>{entry.actorRole}</Badge>
                    <span className="text-xs text-[var(--muted)]">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-white">{entry.diffSummary}</p>
                </div>
              ))}
            </Tabs.Content>

            <Tabs.Content value="timer" className="space-y-4">
              {dayPlan.activeTimer ? (
                <div className="rounded-[24px] border border-[rgba(255,111,59,0.35)] bg-[rgba(255,111,59,0.1)] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Hourglass className="h-4 w-4 text-[var(--accent)]" />
                    <span className="text-sm font-medium text-white">Active focus timer</span>
                  </div>
                  <p className="text-sm text-[var(--muted-strong)]">
                    Started at {formatTime(dayPlan.activeTimer.startedAt)}
                  </p>
                  <Button className="mt-4" onClick={onStopTimer}>
                    <Square className="h-4 w-4" />
                    Stop active timer
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">No timer is running. Start one from the selected task.</p>
              )}
            </Tabs.Content>
            </Tabs.Root>
          </Card>
        </div>
      </div>
    </DndContext>
  );
}
