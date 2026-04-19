import type { Task } from "@timefraim/shared";
import { Check } from "lucide-react";

type DoneTodayRailProps = {
  tasks: Task[];
  onReactivate: (task: Task) => void;
};

export function DoneTodayRail({ tasks, onReactivate }: DoneTodayRailProps) {
  return (
    <ul className="mt-3 space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"
            >
              <Check className="h-3 w-3" />
            </span>
            <span className="truncate text-sm text-[var(--muted-strong)] line-through">{task.title}</span>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-full px-2 py-1 text-xs text-[var(--muted)] hover:bg-white/10 hover:text-white"
            onClick={() => onReactivate(task)}
            aria-label={`Reactivate ${task.title}`}
          >
            Undo
          </button>
        </li>
      ))}
    </ul>
  );
}
