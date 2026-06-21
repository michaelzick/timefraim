import { ArrowDownUp, ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ChevronDown, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KANBAN_SORT_OPTIONS, type KanbanSortMode } from "@/features/kanban/kanban-sort";

const SORT_MODE_ICON: Record<KanbanSortMode, LucideIcon> = {
  priority: ArrowDownUp,
  "date-asc": ArrowUpNarrowWide,
  "date-desc": ArrowDownWideNarrow,
};

export function KanbanSortDropdown({
  columnTitle,
  sortMode,
  onSortModeChange,
}: {
  columnTitle: string;
  sortMode: KanbanSortMode;
  onSortModeChange: (mode: KanbanSortMode) => void;
}) {
  const ActiveIcon = SORT_MODE_ICON[sortMode];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sort ${columnTitle} column`}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-2 text-[var(--muted-strong)] outline-none transition hover:border-[var(--panel-border-strong)] hover:text-[var(--heading)] focus-visible:ring-2 focus-visible:ring-[var(--timeline-selection-ring)]"
        >
          <ActiveIcon className="pointer-events-none h-3.5 w-3.5" />
          <ChevronDown className="pointer-events-none h-3 w-3 text-[var(--planner-surface-meta)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[176px] rounded-xl p-1 text-xs">
        {KANBAN_SORT_OPTIONS.map((option) => {
          const OptionIcon = SORT_MODE_ICON[option.mode];
          const isActive = option.mode === sortMode;
          return (
            <DropdownMenuItem
              key={option.mode}
              className="gap-2 rounded-lg px-2 py-1.5 leading-none"
              onSelect={() => onSortModeChange(option.mode)}
            >
              <OptionIcon className="h-3.5 w-3.5 text-[var(--planner-surface-meta)]" />
              <span className="flex-1">{option.label}</span>
              {isActive ? <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
