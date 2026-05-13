import type {
  GoogleCalendarSettings,
  GoogleCalendarSettingsUpdate,
  GooglePlannerSyncTarget,
} from "@timefraim/shared";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { showActionError } from "@/features/planner/planner-page-utils";

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
  const [localPlannerSyncTarget, setLocalPlannerSyncTarget] =
    useState<GooglePlannerSyncTarget | null>(null);

  const effectiveSelection = localSelection ?? settings?.syncCalendarIds ?? [];
  const savedPlannerSyncTarget =
    settings?.plannerSyncTarget
    ?? (settings?.syncPlannerBlocksToCalendar === false ? "none" : "calendar_event");
  const effectivePlannerSyncTarget =
    localPlannerSyncTarget ?? savedPlannerSyncTarget;
  const isSelectionDirty = localSelection !== null && JSON.stringify(localSelection) !== JSON.stringify(settings?.syncCalendarIds ?? []);
  const isPlannerSyncDirty = localPlannerSyncTarget !== null
    && localPlannerSyncTarget !== savedPlannerSyncTarget;
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
    try {
      await onSave({
        syncCalendarIds: effectiveSelection,
        syncPlannerBlocksToCalendar: effectivePlannerSyncTarget === "calendar_event",
        plannerSyncTarget: effectivePlannerSyncTarget,
      });
      setLocalSelection(null);
      setLocalPlannerSyncTarget(null);
    } catch (error) {
      showActionError("Failed to save Google calendar settings. Please try again.", error);
    }
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
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Timeline sync</p>
        {[
          {
            value: "calendar_event",
            title: "Create Google Calendar events",
            description: "Timeline blocks are mirrored to the planner calendar.",
          },
          {
            value: "task",
            title: "Create Google Tasks",
            description: "Timeline blocks are mirrored to your default Google Tasks list.",
          },
          {
            value: "none",
            title: "Keep timeline blocks local",
            description: "Scheduling changes stay inside TimeFraim.",
          },
        ].map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-subtle)] px-4 py-3 text-sm text-[var(--heading)] hover:bg-[var(--panel-hover)]"
          >
            <input
              type="radio"
              name="planner-sync-target"
              checked={effectivePlannerSyncTarget === option.value}
              onChange={() => setLocalPlannerSyncTarget(option.value as GooglePlannerSyncTarget)}
              className="mt-0.5 h-4 w-4 shrink-0 border-[var(--panel-border-strong)] bg-transparent accent-[var(--accent)]"
            />
            <span className="space-y-1">
              <span className="block font-medium text-[var(--heading)]">{option.title}</span>
              <span className="block text-[var(--muted-strong)]">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
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
