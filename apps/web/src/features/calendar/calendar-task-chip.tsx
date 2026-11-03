import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { CALENDAR_DRAG_TYPE } from "@/features/calendar/calendar-dnd";
import type { CalendarEntry } from "@/features/calendar/calendar-entries";
import { buildPlannerTaskHref } from "@/features/kanban/kanban-utils";
import { getTaskPriorityTimelineBlockClass } from "@/features/planner/task-presentation";
import { cn, formatTime } from "@/lib/utils";

type ChipLayout = "inline" | "stacked";

function ChipContent({ entry, layout }: { entry: CalendarEntry; layout: ChipLayout }) {
  const isDone = entry.task.status === "done";
  const time = entry.startAt ? formatTime(entry.startAt) : null;

  return (
    <span className={cn("min-w-0", layout === "inline" ? "flex items-baseline gap-1.5" : "block")}>
      {time ? (
        <span className={cn("shrink-0 text-[10px] text-[var(--planner-surface-meta)]", layout === "stacked" && "block")}>
          {time}
        </span>
      ) : null}
      <span className={cn("block truncate font-medium text-[var(--planner-surface-title)]", isDone && "line-through")}>
        {entry.task.title}
      </span>
    </span>
  );
}

function getChipClass(entry: CalendarEntry) {
  return cn(
    "block w-full cursor-pointer overflow-hidden rounded-lg border px-1.5 py-0.5 text-left text-[11px] leading-[14px] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
    getTaskPriorityTimelineBlockClass(entry.task.priority),
    entry.task.status === "done" && "opacity-50",
  );
}

export function CalendarTaskChip({
  entry,
  layout = "inline",
  className,
  style,
}: {
  entry: CalendarEntry;
  layout?: ChipLayout;
  className?: string;
  style?: CSSProperties;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `calendar-task-${entry.task.id}`,
    disabled: !entry.blockId,
    data: { dragType: CALENDAR_DRAG_TYPE, entry },
  });

  return (
    // A button rather than a link, so the browser's native link drag can't fight dnd-kit.
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className={cn(getChipClass(entry), isDragging && "opacity-40", className)}
      onClick={() => void navigate(buildPlannerTaskHref(entry.date, entry.task.id))}
      {...listeners}
      {...(entry.blockId ? attributes : {})}
    >
      <ChipContent entry={entry} layout={layout} />
    </button>
  );
}

export function CalendarTaskChipPreview({ entry }: { entry: CalendarEntry }) {
  return (
    <div className={cn(getChipClass(entry), "pointer-events-none w-[180px] shadow-[var(--shadow-elevated)]")}>
      <ChipContent entry={entry} layout="inline" />
    </div>
  );
}
