import type { CalendarEventView, TogglIntegrationSettings } from "@timefraim/shared";
import { Play, Square } from "lucide-react";
import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTogglProjectOptions } from "@/features/planner/toggl-project-options";
import type { CalendarEventFormValues } from "@/features/planner/types";
import { formatTime } from "@/lib/utils";

type CalendarEventDetailCardProps = {
  detailPanelRef: RefObject<HTMLDivElement | null>;
  event: CalendarEventView;
  activeTimerCalendarEventId: string | null;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  form: UseFormReturn<CalendarEventFormValues>;
  onSaveEvent: (values: CalendarEventFormValues) => Promise<unknown>;
  onStartEventTimer: (calendarEventId: string) => void;
  onStopTimer: () => void;
};

export function CalendarEventDetailCard({
  detailPanelRef,
  event,
  activeTimerCalendarEventId,
  isMutating,
  togglSettings,
  form,
  onSaveEvent,
  onStartEventTimer,
  onStopTimer,
}: CalendarEventDetailCardProps) {
  const isTimerRunning = activeTimerCalendarEventId === event.id;
  const projectOptions = getTogglProjectOptions(togglSettings, event.togglProjectId ?? null);
  const missingProjectSelected =
    event.togglProjectId && projectOptions[0]?.id === event.togglProjectId && projectOptions[0]?.name.startsWith("Missing project");

  return (
    <Card ref={detailPanelRef} data-planner-detail-panel="true">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Focus</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--heading)]">Calendar event</h2>
        </div>
        <Badge
          className="normal-case tracking-[0.08em]"
          style={{
            borderColor: event.backgroundColor ?? "#6374ad",
            backgroundColor: "transparent",
            color: "var(--heading)",
          }}
        >
          {event.sourceCalendarName ?? "Google Calendar"}
        </Badge>
      </div>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSaveEvent)}>
        <div className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-4">
          <p className="text-sm font-medium text-[var(--heading)]">{event.title}</p>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            {formatTime(event.startAt)} to {formatTime(event.endAt)}
          </p>
        </div>
        <div className="space-y-2">
          <select
            aria-label="Event Toggl project"
            className="h-11 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!togglSettings.connected}
            {...form.register("togglProjectId")}
          >
            <option value="">
              {togglSettings.defaultProjectName
                ? `Use workspace default (${togglSettings.defaultProjectName})`
                : togglSettings.connected
                  ? "Without project"
                  : "Connect Toggl in Settings to assign a project"}
            </option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted)]">
            {!togglSettings.connected
              ? "Connect Toggl in Settings to edit per-event project mapping."
              : missingProjectSelected
                ? "This event still references a Toggl project that is no longer in the current workspace catalog."
                : `This event will start timers in ${togglSettings.workspaceName ?? "your saved Toggl workspace"}.`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button type="submit" disabled={isMutating}>
            Save
          </Button>
          {isTimerRunning ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onStopTimer}
              disabled={isMutating}
            >
              <Square className="h-4 w-4" />
              Stop timer
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onStartEventTimer(event.id)}
              disabled={isMutating}
            >
              <Play className="h-4 w-4" />
              Start timer
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
