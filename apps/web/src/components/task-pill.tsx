import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@timefraim/shared";
import { Clock3, GripVertical, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TaskPill({
  task,
  active,
  onSelect,
  onDelete,
}: {
  task: Task;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "group w-full rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 text-left transition hover:border-white/20 hover:bg-white/6",
        active && "border-[var(--accent)] bg-[rgba(255,111,59,0.12)]",
        isDragging && "opacity-65",
      )}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      {...listeners}
      {...attributes}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <Badge>{task.status.replace("_", " ")}</Badge>
        <div className="flex items-center gap-1">
          {onDelete ? (
            <button
              type="button"
              className="rounded-full p-1 text-[var(--muted)] opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label={`Delete ${task.title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <GripVertical className="h-4 w-4 text-[var(--muted)]" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-medium text-white">{task.title}</h3>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{task.estimatedMinutes} min</span>
        </div>
      </div>
    </div>
  );
}
