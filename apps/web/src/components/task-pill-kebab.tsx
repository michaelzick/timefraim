import { Check, Copy, MoreVertical, Play, Trash2 } from "lucide-react";
import type { PointerEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TaskPillKebabProps = {
  label: string;
  onDuplicate: () => void;
  onStartTimer?: () => void;
  onMarkDone?: () => void;
  onDelete?: () => void;
};

export function TaskPillKebab({ label, onDuplicate, onStartTimer, onMarkDone, onDelete }: TaskPillKebabProps) {
  const stopPointer = (event: PointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="cursor-pointer rounded-full p-1 text-[var(--muted)] transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label={`More actions for ${label}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={stopPointer}
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onPointerDown={stopPointer}>
        <DropdownMenuItem onSelect={onDuplicate}>
          <Copy className="h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        {onStartTimer ? (
          <DropdownMenuItem onSelect={onStartTimer}>
            <Play className="h-4 w-4" /> Start timer
          </DropdownMenuItem>
        ) : null}
        {onMarkDone ? (
          <DropdownMenuItem onSelect={onMarkDone}>
            <Check className="h-4 w-4" /> Mark done
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" onSelect={onDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
