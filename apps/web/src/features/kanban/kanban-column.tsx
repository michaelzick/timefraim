import { useDroppable } from "@dnd-kit/core";
import type { ScheduleBlock, Task } from "@timefraim/shared";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanCard } from "@/features/kanban/kanban-card";
import { getTaskScheduleLabel } from "@/features/kanban/kanban-schedule-label";
import type { KanbanColumnDefinition, KanbanStatus } from "@/features/kanban/kanban-types";
import { buildPlannerTaskHrefForTask } from "@/features/kanban/kanban-utils";
import { cn } from "@/lib/utils";

type KanbanColumnProps = {
  activeTimerTaskId: string | null;
  activeTimerStartedAt: string | null;
  column: KanbanColumnDefinition;
  date: string;
  scheduleBlocks: ScheduleBlock[];
  tasks: Task[];
  onDeleteTask: (task: Task) => void;
  onPlanTask: (task: Task, targetStatus: KanbanStatus) => void;
  onPriorityChange: (task: Task, priority: Task["priority"]) => void;
  onRemoveTask: (task: Task) => void;
  onStartTimer: (taskId: string) => void;
  onStopTimer: () => void;
};

export function KanbanColumn({
  activeTimerTaskId,
  activeTimerStartedAt,
  column,
  date,
  scheduleBlocks,
  tasks,
  onDeleteTask,
  onPlanTask,
  onPriorityChange,
  onRemoveTask,
  onStartTimer,
  onStopTimer,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-column-${column.status}`,
    data: { kanbanStatus: column.status },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[560px] flex-col rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-3 transition",
        isOver && "border-[var(--accent)] bg-[var(--accent-soft)]",
      )}
    >
      <header className="mb-3 px-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--heading)]">{column.title}</h3>
          <Badge>{tasks.length}</Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{column.caption}</p>
      </header>
      <ScrollArea className="min-h-0 flex-1 pr-1">
        <div className="space-y-3">
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              activeTimerTaskId={activeTimerTaskId}
              activeTimerStartedAt={activeTimerStartedAt}
              kanbanStatus={column.status}
              plannerHref={buildPlannerTaskHrefForTask(task, date, scheduleBlocks)}
              scheduleLabel={getTaskScheduleLabel(task, scheduleBlocks)}
              task={task}
              onDeleteTask={onDeleteTask}
              onPlanTask={onPlanTask}
              onPriorityChange={onPriorityChange}
              onRemoveTask={onRemoveTask}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
            />
          ))}
          {tasks.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[var(--panel-border-strong)] p-5 text-sm text-[var(--muted)]">
              No tasks
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </section>
  );
}
