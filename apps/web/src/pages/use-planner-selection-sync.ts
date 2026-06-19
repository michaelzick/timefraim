import { startTransition, useEffect } from "react";
import type { PlannerSelection, SelectedTaskSource } from "@/features/planner/planner-page-selection";

type SelectionSyncArgs = {
  plannerSelection: PlannerSelection;
  resolvedSelectedTaskId: string | null;
  resolvedSelectedTaskSource: SelectedTaskSource;
  selectedTaskState: { taskId: string | null; source: SelectedTaskSource };
  setSelectedTaskState: (state: { taskId: string | null; source: SelectedTaskSource }) => void;
  setPlannerSelection: (selection: PlannerSelection) => void;
};

export function usePlannerSelectionSync({
  plannerSelection,
  resolvedSelectedTaskId,
  resolvedSelectedTaskSource,
  selectedTaskState,
  setSelectedTaskState,
  setPlannerSelection,
}: SelectionSyncArgs) {
  useEffect(() => {
    if (plannerSelection.type === "calendar-event" || plannerSelection.type === "none") {
      return;
    }

    if (
      selectedTaskState.taskId === resolvedSelectedTaskId &&
      selectedTaskState.source === resolvedSelectedTaskSource
    ) {
      return;
    }

    startTransition(() => {
      setSelectedTaskState({
        taskId: resolvedSelectedTaskId,
        source: resolvedSelectedTaskSource,
      });
    });
  }, [
    plannerSelection.type,
    resolvedSelectedTaskId,
    resolvedSelectedTaskSource,
    selectedTaskState.source,
    selectedTaskState.taskId,
    setSelectedTaskState,
  ]);

  function handleClearSelection() {
    if (plannerSelection.type === "none" && selectedTaskState.taskId === null) {
      return;
    }

    startTransition(() => {
      setSelectedTaskState({ taskId: null, source: "queue" });
      setPlannerSelection({ type: "none" });
    });
  }

  return { handleClearSelection };
}
