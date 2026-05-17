import { BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";

type SettingsTaskNotificationsCardProps = {
  startEnabled: boolean;
  endEnabled: boolean;
  supported: boolean;
  message: string | null;
  onStartChange: (nextEnabled: boolean) => Promise<void> | void;
  onEndChange: (nextEnabled: boolean) => Promise<void> | void;
};

type NotificationToggleProps = {
  checked: boolean;
  supported: boolean;
  title: string;
  description: string;
  onChange: (nextEnabled: boolean) => Promise<void> | void;
};

function NotificationToggle({
  checked,
  supported,
  title,
  description,
  onChange,
}: NotificationToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-4 py-4 text-sm text-[var(--heading)] hover:bg-[var(--panel-hover)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          void onChange(event.target.checked);
        }}
        disabled={!supported}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--panel-border-strong)] bg-transparent accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="space-y-1">
        <span className="block font-medium text-[var(--heading)]">{title}</span>
        <span className="block text-[var(--muted-strong)]">{description}</span>
      </span>
    </label>
  );
}

export function SettingsTaskNotificationsCard({
  startEnabled,
  endEnabled,
  supported,
  message,
  onStartChange,
  onEndChange,
}: SettingsTaskNotificationsCardProps) {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-[rgba(255,111,59,0.12)] p-3 text-[var(--accent)]">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Planner alerts</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--heading)]">Task pop-ups</h2>
        </div>
      </div>
      <div className="space-y-3">
        <NotificationToggle
          checked={startEnabled}
          supported={supported}
          title="Show a browser pop-up when a task starts"
          description="Enable a browser notification when a scheduled task reaches its start time."
          onChange={onStartChange}
        />
        <NotificationToggle
          checked={endEnabled}
          supported={supported}
          title="Show a browser pop-up when a task ends"
          description="Enable a browser notification when a scheduled task reaches its end time."
          onChange={onEndChange}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        {message ?? "These settings stay in this browser only."}
      </p>
    </Card>
  );
}
