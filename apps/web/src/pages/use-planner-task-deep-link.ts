import type { DayPlan } from "@timefraim/shared";
import { startTransition, useEffect, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import type { PlannerSelection, SelectedTaskSource } from "@/features/planner/planner-page-selection";

type UsePlannerTaskDeepLinkOptions = {
  dayPlan: DayPlan;
  detailPanelRef: RefObject<HTMLDivElement | null>;
  plannerSelection: PlannerSelection;
  setPlannerSelection: (selection: PlannerSelection) => void;
  setSelectedTaskState: (state: { taskId: string | null; source: SelectedTaskSource }) => void;
};

export function usePlannerTaskDeepLink({
  dayPlan,
  detailPanelRef,
  plannerSelection,
  setPlannerSelection,
  setSelectedTaskState,
}: UsePlannerTaskDeepLinkOptions) {
  const location = useLocation();
  const taskId = new URLSearchParams(location.search).get("task");

  useEffect(() => {
    if (!taskId || isPlannerSelectionCurrent(plannerSelection, taskId)) {
      return;
    }

    const task = dayPlan.tasks.find((candidate) => candidate.id === taskId);
    if (!task) {
      return;
    }

    const source = task.scheduledBlockId ? "timeline" : "queue";
    startTransition(() => {
      setSelectedTaskState({ taskId, source });
      setPlannerSelection(source === "timeline" ? { type: "timeline-task", taskId } : { type: "queue-task", taskId });
    });
    detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [dayPlan.tasks, detailPanelRef, plannerSelection, setPlannerSelection, setSelectedTaskState, taskId]);
}

function isPlannerSelectionCurrent(selection: PlannerSelection, taskId: string) {
  return (
    (selection.type === "queue-task" || selection.type === "timeline-task")
    && selection.taskId === taskId
  );
}
