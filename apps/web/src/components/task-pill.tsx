import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@schejewel/shared";
import { Clock3, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TaskPill({
  task,
  active,
  onSelect,
}: {
  task: Task;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "w-full rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 text-left transition hover:border-white/20 hover:bg-white/6",
        active && "border-[var(--accent)] bg-[rgba(255,111,59,0.12)]",
        isDragging && "opacity-65",
      )}
      onClick={onSelect}
      type="button"
      {...listeners}
      {...attributes}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <Badge>{task.status.replace("_", " ")}</Badge>
        <GripVertical className="h-4 w-4 text-[var(--muted)]" />
      </div>
      <div className="space-y-2">
        <h3 className="font-medium text-white">{task.title}</h3>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{task.estimatedMinutes} min</span>
        </div>
      </div>
    </button>
  );
}
