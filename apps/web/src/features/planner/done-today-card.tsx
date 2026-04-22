import type { Task } from "@timefraim/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { DoneTodayRail } from "@/features/planner/done-today-rail";

type DoneTodayCardProps = {
  tasks: Task[];
  onReactivate: (task: Task) => void;
};

export function DoneTodayCard({ tasks, onReactivate }: DoneTodayCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)] hover:text-[var(--heading)]"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span>Done today · {tasks.length}</span>
      </button>
      {open ? <DoneTodayRail tasks={tasks} onReactivate={onReactivate} /> : null}
    </Card>
  );
}
