import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CalendarDropZone({
  id,
  date,
  label,
  className,
  children,
}: {
  id: string;
  date: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { calendarDate: date } });

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={label}
      className={cn(className, isOver && "bg-[rgba(255,111,59,0.08)]")}
    >
      {children}
    </div>
  );
}
