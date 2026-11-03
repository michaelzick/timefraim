import type { ScheduleBlock, Task } from "@timefraim/shared";
import { useState } from "react";
import type { MoveTaskTarget, MoveTaskValues } from "@/features/planner/move-task-dialog";
import { runScheduleBlockMove } from "@/features/planner/schedule-block-move";
import type { PlannerScheduleBlockUpdateInput } from "@/features/planner/types";

export function useMoveTaskDialog(args: {
  date: string;
  tasks: Task[];
  onDateChange: (nextDate: string) => void;
  onMovedOffDay: (taskId: string) => void;
  onUpdateScheduleBlock: (scheduleBlockId: string, values: PlannerScheduleBlockUpdateInput) => Promise<unknown>;
}) {
  const [target, setTarget] = useState<MoveTaskTarget | null>(null);

  // Rejections reach the dialog, which stays open and shows them.
  const submit = async (values: MoveTaskValues) => {
    if (!target) return;
    const result = await runScheduleBlockMove({
      block: target.block,
      targetDate: values.date,
      startTime: values.time,
      tasks: args.tasks,
      onUpdateScheduleBlock: args.onUpdateScheduleBlock,
      onViewDay: args.onDateChange,
    });
    if (result === "moved" && values.date !== args.date) {
      args.onMovedOffDay(target.task.id);
    }
    setTarget(null);
  };

  return {
    target,
    open: (block: ScheduleBlock, task: Task) => setTarget({ block, task }),
    close: () => setTarget(null),
    submit,
  };
}
