import { BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";

type SettingsTaskEndNotificationsCardProps = {
  enabled: boolean;
  supported: boolean;
  message: string | null;
  onChange: (nextEnabled: boolean) => Promise<void> | void;
};

export function SettingsTaskEndNotificationsCard({
  enabled,
  supported,
  message,
  onChange,
}: SettingsTaskEndNotificationsCardProps) {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-[rgba(255,111,59,0.12)] p-3 text-[var(--accent)]">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Planner alerts</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--heading)]">Task end pop-ups</h2>
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-4 py-4 text-sm text-[var(--heading)] hover:bg-[var(--panel-hover)]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            void onChange(event.target.checked);
          }}
          disabled={!supported}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--panel-border-strong)] bg-transparent accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="space-y-1">
          <span className="block font-medium text-[var(--heading)]">Show browser pop-ups when a task ends</span>
          <span className="block text-[var(--muted-strong)]">
            Enable a browser notification when a scheduled task reaches its end time.
          </span>
        </span>
      </label>
      <p className="mt-3 text-xs text-[var(--muted)]">
        {message ?? "This setting stays in this browser only."}
      </p>
    </Card>
  );
}
