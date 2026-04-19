import type { Task } from "@timefraim/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { TaskPill } from "@/components/task-pill";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DoneTodayRail } from "@/features/planner/done-today-rail";

type TaskQueueCardProps = {
  search: string;
  selectedTaskId: string | null;
  activeTimerTaskId: string | null;
  tasks: Task[];
  doneTasks: Task[];
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string, title: string) => void;
  onDuplicateTask: (task: Task) => void;
  onStartTaskTimer: (taskId: string) => void;
  onMarkTaskDone: (task: Task) => void;
  onReactivateDoneTask: (task: Task) => void;
};

export function TaskQueueCard({
  search,
  selectedTaskId,
  activeTimerTaskId,
  tasks,
  doneTasks,
  onSearchChange,
  onSelectTask,
  onDeleteTask,
  onDuplicateTask,
  onStartTaskTimer,
  onMarkTaskDone,
  onReactivateDoneTask,
}: TaskQueueCardProps) {
  const [doneOpen, setDoneOpen] = useState(false);

  return (
    <Card className="min-h-[520px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Queue</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Tasks ready to place</h2>
        </div>
        <Input
          aria-label="Filter tasks"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filter tasks"
          className="max-w-[160px]"
        />
      </div>
      <ScrollArea className="h-[420px] pr-2">
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskPill
              key={task.id}
              task={task}
              active={selectedTaskId === task.id}
              runState={activeTimerTaskId === task.id ? "running" : "idle"}
              onSelect={() => onSelectTask(task.id)}
              onDelete={() => onDeleteTask(task.id, task.title)}
              onDuplicate={() => onDuplicateTask(task)}
              onStartTimer={() => onStartTaskTimer(task.id)}
              onMarkDone={() => onMarkTaskDone(task)}
            />
          ))}
        </div>
      </ScrollArea>
      {doneTasks.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)] hover:text-white"
            onClick={() => setDoneOpen((prev) => !prev)}
            aria-expanded={doneOpen}
          >
            {doneOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>Done today · {doneTasks.length}</span>
          </button>
          {doneOpen ? (
            <DoneTodayRail tasks={doneTasks} onReactivate={onReactivateDoneTask} />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
