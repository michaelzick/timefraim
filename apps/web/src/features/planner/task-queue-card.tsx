import type { Task } from "@timefraim/shared";
import { Search } from "lucide-react";
import { TaskPill } from "@/components/task-pill";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type TaskQueueCardProps = {
  selectedTaskId: string | null;
  activeTimerTaskId: string | null;
  copyDragTaskId?: string | null;
  search: string;
  tasks: Task[];
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string, title: string) => void;
  onDuplicateTask: (task: Task) => void;
  onStartTaskTimer: (taskId: string) => void;
};

export function TaskQueueCard({
  selectedTaskId,
  activeTimerTaskId,
  copyDragTaskId = null,
  search,
  tasks,
  onSearchChange,
  onSelectTask,
  onDeleteTask,
  onDuplicateTask,
  onStartTaskTimer,
}: TaskQueueCardProps) {
  return (
    <Card className="xl:min-h-[520px]">
      <div className="mb-4 border-b border-[var(--panel-border)] pb-4">
        <label
          htmlFor="task-queue-filter"
          className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
        >
          Filter tasks
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          />
          <Input
            id="task-queue-filter"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search queue"
            className="pl-10"
          />
        </div>
      </div>
      <ScrollArea className="max-h-[60vh] pr-2 xl:h-[420px]">
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskPill
              key={task.id}
              task={task}
              active={selectedTaskId === task.id}
              isCopyDragSource={copyDragTaskId === task.id}
              runState={activeTimerTaskId === task.id ? "running" : "idle"}
              onSelect={() => onSelectTask(task.id)}
              onDelete={() => onDeleteTask(task.id, task.title)}
              onDuplicate={() => onDuplicateTask(task)}
              onStartTimer={() => onStartTaskTimer(task.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
