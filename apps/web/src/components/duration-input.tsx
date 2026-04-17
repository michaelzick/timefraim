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
    <div className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-1">
        <Input
          aria-label={`${ariaLabelPrefix} estimated hours`}
          type="number"
          min={0}
          step={1}
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
        <span className="text-xs text-[var(--muted)]">hr</span>
      </div>
      <div className="flex items-center gap-1">
        <Input
          aria-label={`${ariaLabelPrefix} estimated minutes`}
          type="number"
          min={0}
          step={5}
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
        <span className="text-xs text-[var(--muted)]">min</span>
      </div>
    </div>
  );
}
