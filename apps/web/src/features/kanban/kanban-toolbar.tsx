import { Plus, Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type KanbanToolbarProps = {
  doneCount: number;
  isCreateTaskOpen: boolean;
  search: string;
  scheduledCount: number;
  taskCount: number;
  onCreateTaskToggle: () => void;
  onSearchChange: (value: string) => void;
};

export function KanbanToolbar({
  doneCount,
  isCreateTaskOpen,
  search,
  scheduledCount,
  taskCount,
  onCreateTaskToggle,
  onSearchChange,
}: KanbanToolbarProps) {
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape" || search.length === 0) {
      return;
    }

    event.preventDefault();
    onSearchChange("");
  };

  return (
    <section className="rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel-elevated)] p-5 shadow-[var(--shadow-elevated)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-[var(--heading)]">Board</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{taskCount} tasks</Badge>
            <Badge>{scheduledCount} scheduled</Badge>
            <Badge>{doneCount} done</Badge>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant={isCreateTaskOpen ? "secondary" : "default"}
            aria-expanded={isCreateTaskOpen}
            aria-controls="kanban-create-task-panel"
            onClick={onCreateTaskToggle}
          >
            {isCreateTaskOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isCreateTaskOpen ? "Close" : "New task"}
          </Button>
          <div className="relative sm:w-[280px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
            />
            <Input
              aria-label="Search board tasks"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search board"
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
