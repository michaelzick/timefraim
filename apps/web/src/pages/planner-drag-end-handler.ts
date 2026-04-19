import type { DragEndEvent } from "@dnd-kit/core";
import type { PlannerDuplicateResult } from "@timefraim/shared";
import type { MutableRefObject } from "react";
import { toast } from "sonner";
import { handlePlannerDragEnd, type PlannerSelection, type SelectedTaskSource } from "@/features/planner/planner-page-selection";
import { showActionError } from "@/features/planner/planner-page-utils";
import type { PlannerScheduleBlockUpdateInput } from "@/features/planner/types";

export function createPlannerDragEndHandler(args: {
  isAltPressedRef: MutableRefObject<boolean>;
  onCreateScheduleBlock: (values: {
    taskId: string;
    startAt: string;
    endAt: string;
    source: "manual";
  }) => Promise<unknown>;
  onDeleteScheduleBlock: (scheduleBlockId: string) => Promise<unknown>;
  onDeleteTask: (taskId: string) => Promise<unknown>;
  onDuplicateTask: (
    taskId: string,
    body?: { startAt?: string; endAt?: string; plannerDate?: string },
  ) => Promise<PlannerDuplicateResult>;
  onDuplicateScheduleBlock: (
    scheduleBlockId: string,
    body: { startAt: string; endAt: string },
  ) => Promise<PlannerDuplicateResult>;
  updateScheduleBlock: (
    scheduleBlockId: string,
    values: PlannerScheduleBlockUpdateInput,
  ) => Promise<unknown>;
  setPlannerSelection: (selection: PlannerSelection) => void;
  setSelectedTaskState: (state: {
    taskId: string | null;
    source: SelectedTaskSource;
  }) => void;
}) {
  return async function handleDragEnd(event: DragEndEvent) {
    await handlePlannerDragEnd({
      event,
      isAltPressed: args.isAltPressedRef.current,
      onCreateScheduleBlock: args.onCreateScheduleBlock,
      onUpdateScheduleBlock: args.updateScheduleBlock,
      onDuplicateTask: args.onDuplicateTask,
      onDuplicateScheduleBlock: args.onDuplicateScheduleBlock,
      onQueueTaskSelected: (taskId) => {
        args.setSelectedTaskState({ taskId, source: "timeline" });
        args.setPlannerSelection({ type: "timeline-task", taskId });
      },
      onQueueTaskReset: (taskId) => {
        args.setSelectedTaskState({ taskId, source: "queue" });
        args.setPlannerSelection({ type: "queue-task", taskId });
      },
      onDuplicated: (kind, id) => {
        toast.success("Duplicated", {
          duration: 8000,
          action: {
            label: "Undo",
            onClick: () => {
              if (kind === "task") {
                void args.onDeleteTask(id);
              } else {
                void args.onDeleteScheduleBlock(id);
              }
            },
          },
        });
      },
      onError: showActionError,
    });
  };
}
