import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMMON_DURATION_OPTIONS = [
  { label: "15 min", valueMinutes: 15 },
  { label: "30 min", valueMinutes: 30 },
  { label: "45 min", valueMinutes: 45 },
  { label: "1 hr", valueMinutes: 60 },
  { label: "1.5 hr", valueMinutes: 90 },
  { label: "2 hr", valueMinutes: 120 },
] as const;

type DurationPresetsProps = {
  valueMinutes: number;
  onSelect: (valueMinutes: number) => void;
  ariaLabelPrefix: string;
};

export function DurationPresets({
  valueMinutes,
  onSelect,
  ariaLabelPrefix,
}: DurationPresetsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
        Quick select
      </p>
      <div
        role="group"
        aria-label={`${ariaLabelPrefix} common durations`}
        className="flex flex-wrap gap-2"
      >
        {COMMON_DURATION_OPTIONS.map((option) => {
          const isActive = valueMinutes === option.valueMinutes;
          return (
            <Button
              key={option.valueMinutes}
              type="button"
              size="sm"
              variant={isActive ? "default" : "secondary"}
              aria-pressed={isActive}
              className={cn(
                "min-w-[4.5rem]",
                !isActive && "text-[var(--muted-strong)]",
              )}
              onClick={() => onSelect(option.valueMinutes)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
