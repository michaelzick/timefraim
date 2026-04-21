import type { Task } from "@timefraim/shared";
import { TaskPill } from "@/components/task-pill";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type TaskQueueCardProps = {
  selectedTaskId: string | null;
  activeTimerTaskId: string | null;
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string, title: string) => void;
  onDuplicateTask: (task: Task) => void;
  onStartTaskTimer: (taskId: string) => void;
};

export function TaskQueueCard({
  selectedTaskId,
  activeTimerTaskId,
  tasks,
  onSelectTask,
  onDeleteTask,
  onDuplicateTask,
  onStartTaskTimer,
}: TaskQueueCardProps) {
  return (
    <Card className="min-h-[520px]">
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
            />
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
