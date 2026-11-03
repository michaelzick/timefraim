import { cn } from "@/lib/utils";

export function getSegmentButtonClassName(isActive: boolean) {
  return cn(
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-text)]",
    isActive
      ? "bg-[var(--accent-soft)] text-[var(--accent-text)] ring-1 ring-inset ring-[var(--accent-ring)] hover:bg-[var(--accent-soft-strong)] hover:text-[var(--accent-text)]"
      : "text-[var(--muted)] hover:text-[var(--text)]",
  );
}
