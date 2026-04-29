import type { GoogleCalendarSettings, GoogleCalendarSettingsUpdate } from "@timefraim/shared";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type SettingsGoogleCalendarsCardProps = {
  settings: GoogleCalendarSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (values: GoogleCalendarSettingsUpdate) => Promise<unknown>;
};

export function SettingsGoogleCalendarsCard({
  settings,
  isLoading,
  isSaving,
  onSave,
}: SettingsGoogleCalendarsCardProps) {
  const [localSelection, setLocalSelection] = useState<string[] | null>(null);
  const [localPlannerSync, setLocalPlannerSync] = useState<boolean | null>(null);

  const effectiveSelection = localSelection ?? settings?.syncCalendarIds ?? [];
  const effectivePlannerSync = localPlannerSync ?? settings?.syncPlannerBlocksToCalendar ?? true;
  const isSelectionDirty = localSelection !== null && JSON.stringify(localSelection) !== JSON.stringify(settings?.syncCalendarIds ?? []);
  const isPlannerSyncDirty = localPlannerSync !== null && localPlannerSync !== (settings?.syncPlannerBlocksToCalendar ?? true);
  const isDirty = isSelectionDirty || isPlannerSyncDirty;

  function handleToggle(calendarId: string, checked: boolean) {
    const base = localSelection ?? settings?.syncCalendarIds ?? [];
    const next = checked
      ? [...base, calendarId]
      : base.filter((id) => id !== calendarId);
    setLocalSelection(next.length > 0 ? next : base);
  }

  async function handleSave() {
    if (!settings || effectiveSelection.length === 0) return;
    await onSave({
      syncCalendarIds: effectiveSelection,
      syncPlannerBlocksToCalendar: effectivePlannerSync,
    });
    setLocalSelection(null);
    setLocalPlannerSync(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-4 text-sm text-[var(--muted-strong)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading calendars...
      </div>
    );
  }

  if (!settings) {
    return (
      <p className="text-sm text-[var(--muted-strong)]">
        No calendars available. Connect your Google account first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-4 py-3 text-sm text-[var(--heading)] hover:bg-[var(--panel-hover)]">
        <input
          type="checkbox"
          checked={effectivePlannerSync}
          onChange={(event) => setLocalPlannerSync(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--panel-border-strong)] bg-transparent accent-[var(--accent)]"
        />
        <span className="space-y-1">
          <span className="block font-medium text-[var(--heading)]">Add scheduled tasks to Google Calendar</span>
          <span className="block text-[var(--muted-strong)]">
            Timeline blocks are added to the planner calendar when this is enabled.
          </span>
        </span>
      </label>
      {settings.availableCalendars.length > 0 ? (
        <>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Source calendars</p>
          <p className="text-sm text-[var(--muted-strong)]">
            Choose which calendars show as blockers on the planner timeline.
          </p>
          <div className="space-y-2">
            {settings.availableCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-4 py-3 text-sm text-[var(--heading)] hover:bg-[var(--panel-hover)]"
              >
                <input
                  type="checkbox"
                  checked={effectiveSelection.includes(cal.id)}
                  onChange={(e) => handleToggle(cal.id, e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-[var(--panel-border-strong)] bg-transparent accent-[var(--accent)]"
                />
                <span className="flex items-center gap-2 truncate">
                  {cal.backgroundColor && (
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cal.backgroundColor }}
                    />
                  )}
                  {cal.name}
                  {cal.primary && (
                    <span className="text-xs text-[var(--muted)]">(primary)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted-strong)]">
          No source calendars are available for timeline blockers.
        </p>
      )}
      {isDirty && (
        <Button onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Save Google calendar settings
        </Button>
      )}
    </div>
  );
}
