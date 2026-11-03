import { Briefcase, LayoutGrid, User } from "lucide-react";
import { getSegmentButtonClassName } from "@/components/segment-button-class";
import { Button } from "@/components/ui/button";
import type { TaskCategoryFilter } from "@/features/planner/planner-page-selection";
import { cn } from "@/lib/utils";

const OPTIONS: { value: TaskCategoryFilter; label: string; icon: typeof LayoutGrid }[] = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "personal", label: "Personal", icon: User },
  { value: "work", label: "Work", icon: Briefcase },
];

export function CategoryFilterControl({
  value,
  onChange,
  ariaLabel,
}: {
  value: TaskCategoryFilter;
  onChange: (value: TaskCategoryFilter) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex items-center gap-1 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-1">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant="ghost"
            aria-label={option.label}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn("h-8 gap-1.5 px-2.5 text-xs", getSegmentButtonClassName(isActive))}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
