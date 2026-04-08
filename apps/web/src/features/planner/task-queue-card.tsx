import type { Task } from "@timefraim/shared";
import { TaskPill } from "@/components/task-pill";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type TaskQueueCardProps = {
  search: string;
  selectedTaskId: string | null;
  tasks: Task[];
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string, title: string) => void;
};

export function TaskQueueCard({
  search,
  selectedTaskId,
  tasks,
  onSearchChange,
  onSelectTask,
  onDeleteTask,
}: TaskQueueCardProps) {
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
              onSelect={() => onSelectTask(task.id)}
              onDelete={() => onDeleteTask(task.id, task.title)}
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
