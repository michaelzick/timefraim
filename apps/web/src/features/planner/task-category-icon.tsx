import type { Task } from "@timefraim/shared";
import { formatTaskCategory, getCategoryIcon } from "@/features/planner/task-presentation";

export function TaskCategoryIcon({
  category,
  size = "sm",
}: {
  category: Task["category"];
  size?: "sm" | "md";
}) {
  const Icon = getCategoryIcon(category);
  const label = formatTaskCategory(category);
  const dimensions = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span
      aria-label={`Category: ${label}`}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel)] text-[var(--muted)]"
    >
      <Icon className={dimensions} />
    </span>
  );
}
