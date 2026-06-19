import type { Task } from "@timefraim/shared";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskCategoryIcon } from "@/features/planner/task-category-icon";
import { CATEGORY_OPTIONS, formatTaskCategory } from "@/features/planner/task-presentation";

export function KanbanCategoryDropdown({
  task,
  onCategoryChange,
}: {
  task: Task;
  onCategoryChange: (task: Task, category: Task["category"]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Category for ${task.title}`}
          className="inline-flex h-6 items-center gap-1 rounded-full outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[var(--timeline-selection-ring)]"
        >
          <TaskCategoryIcon category={task.category} />
          <ChevronDown className="pointer-events-none h-3 w-3 text-[var(--planner-surface-meta)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[88px] rounded-xl p-1 text-xs">
        {CATEGORY_OPTIONS.map((category) => (
          <DropdownMenuItem
            key={category}
            className="h-7 justify-center rounded-lg px-2 py-0 text-center leading-none"
            onSelect={() => onCategoryChange(task, category)}
          >
            <span className="inline-flex h-5 min-w-[64px] items-center justify-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-2 font-semibold text-[var(--muted)]">
              <span className="text-xs leading-none">{formatTaskCategory(category)}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
