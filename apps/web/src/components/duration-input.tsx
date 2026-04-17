import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type DurationInputProps = {
  valueMinutes: number;
  onChange: (totalMinutes: number) => void;
  ariaLabelPrefix: string;
};

export function DurationInput({ valueMinutes, onChange, ariaLabelPrefix }: DurationInputProps) {
  const normalizedHours = Math.max(0, Math.floor(valueMinutes / 60));
  const normalizedMinutes = Math.max(0, valueMinutes % 60);
  const [hoursText, setHoursText] = useState(String(normalizedHours));
  const [minutesText, setMinutesText] = useState(String(normalizedMinutes));

  useEffect(() => {
    setHoursText(String(normalizedHours));
    setMinutesText(String(normalizedMinutes));
  }, [normalizedHours, normalizedMinutes]);

  const commit = (nextHours: number, nextMinutes: number) => {
    onChange(Math.max(0, nextHours) * 60 + Math.max(0, nextMinutes));
  };

  return (
    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
      <div className="min-w-0 flex items-center gap-2">
        <Input
          aria-label={`${ariaLabelPrefix} estimated hours`}
          type="number"
          min={0}
          step={1}
          className="min-w-0 px-3"
          value={hoursText}
          onChange={(event) => {
            const raw = event.target.value;
            setHoursText(raw);
            const nextHours = raw === "" ? 0 : Number(raw);
            if (Number.isFinite(nextHours)) {
              commit(nextHours, Number(minutesText) || 0);
            }
          }}
          onBlur={() => {
            if (hoursText === "") {
              setHoursText("0");
            }
          }}
        />
        <span className="shrink-0 text-xs text-[var(--muted)]">hr</span>
      </div>
      <div className="min-w-0 flex items-center gap-2">
        <Input
          aria-label={`${ariaLabelPrefix} estimated minutes`}
          type="number"
          min={0}
          step={5}
          className="min-w-0 px-3"
          value={minutesText}
          onChange={(event) => {
            const raw = event.target.value;
            setMinutesText(raw);
            const nextMinutes = raw === "" ? 0 : Number(raw);
            if (Number.isFinite(nextMinutes)) {
              commit(Number(hoursText) || 0, nextMinutes);
            }
          }}
          onBlur={() => {
            if (minutesText === "") {
              setMinutesText("0");
            }
          }}
        />
        <span className="shrink-0 text-xs text-[var(--muted)]">min</span>
      </div>
    </div>
  );
}
