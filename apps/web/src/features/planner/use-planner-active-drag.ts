import type { DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import type { ActiveDragPayload } from "@/features/planner/active-drag-preview";

function applyCopyIntent(payload: ActiveDragPayload, isAltPressed: boolean): ActiveDragPayload {
  if (!isAltPressed) return payload;
  if (payload.dragType === "queue-task") {
    return { dragType: "queue-task-copy", task: payload.task };
  }
  if (payload.dragType === "schedule-block") {
    return { dragType: "schedule-block-copy", scheduleBlock: payload.scheduleBlock, task: payload.task };
  }
  return payload;
}

export function usePlannerActiveDrag(isAltPressed: boolean) {
  const [activeDrag, setActiveDrag] = useState<ActiveDragPayload | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (!data || typeof data.dragType !== "string") {
      return;
    }
    setActiveDrag(data as ActiveDragPayload);
  };

  return {
    activeDragPayload: activeDrag ? applyCopyIntent(activeDrag, isAltPressed) : null,
    clearActiveDrag: () => setActiveDrag(null),
    copyDragScheduleBlockId:
      activeDrag?.dragType === "schedule-block" && isAltPressed ? activeDrag.scheduleBlock.id : null,
    copyDragTaskId: activeDrag?.dragType === "queue-task" && isAltPressed ? activeDrag.task.id : null,
    handleDragStart,
  };
}
