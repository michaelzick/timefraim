import type { ScheduleBlock, Task } from "@timefraim/shared";
import { useForm } from "react-hook-form";
import { START_HOUR } from "@/components/timeline-geometry";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getActionErrorMessage } from "@/features/planner/planner-page-utils";
import { formatLocalTimeInput } from "@/features/planner/schedule-block-move";
import { formatPlannerDateFromIso } from "@/lib/utils";

export type MoveTaskTarget = {
  block: ScheduleBlock;
  task: Task;
};

export type MoveTaskValues = {
  date: string;
  time: string;
};

const EARLIEST_START_TIME = `${String(START_HOUR).padStart(2, "0")}:00`;

// The timeline only renders from START_HOUR, so an earlier start would hide the task.
function validateStartTime(time: string) {
  return time >= EARLIEST_START_TIME || "The timeline starts at 4:00 AM. Pick a later time.";
}

export function MoveTaskDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: MoveTaskTarget;
  onClose: () => void;
  onSubmit: (values: MoveTaskValues) => Promise<void>;
}) {
  const form = useForm<MoveTaskValues>({
    defaultValues: {
      date: formatPlannerDateFromIso(target.block.startAt) ?? "",
      time: formatLocalTimeInput(target.block.startAt),
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = async (values: MoveTaskValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error(error);
      form.setError("root", {
        message: getActionErrorMessage("Failed to move the task. Please try again.", error),
      });
    }
  };

  const errorMessage = errors.date?.message ?? errors.time?.message ?? errors.root?.message;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Move to date</DialogTitle>
        <DialogDescription className="truncate">{target.task.title}</DialogDescription>
        <form className="mt-5 space-y-4" noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0 space-y-1.5 text-xs font-medium text-[var(--muted-strong)]">
              Date
              <Input type="date" {...form.register("date", { required: "Pick a date." })} />
            </label>
            <label className="min-w-0 space-y-1.5 text-xs font-medium text-[var(--muted-strong)]">
              Start time
              <Input
                type="time"
                {...form.register("time", { required: "Pick a start time.", validate: validateStartTime })}
              />
            </label>
          </div>
          {errorMessage ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {errorMessage}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Move
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
