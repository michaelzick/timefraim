import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type PlannerSectionHeaderProps = {
  title: string;
  isOpen: boolean;
  controlsId: string;
  onToggle: () => void;
  eyebrow?: string;
  endContent?: ReactNode;
};

export function PlannerSectionHeader({
  title,
  isOpen,
  controlsId,
  onToggle,
  eyebrow,
  endContent,
}: PlannerSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-3 text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={controlsId}
      >
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{eyebrow}</p> : null}
          <span className={`${eyebrow ? "mt-1 " : ""}block text-xl font-semibold text-[var(--heading)]`}>
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" />
        )}
      </button>
      {endContent ? <div className="shrink-0">{endContent}</div> : null}
    </div>
  );
}
