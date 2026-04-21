import type {
  AuthSession,
  GoogleCalendarSettings,
  TogglConnect,
  TogglDiscoverInput,
  TogglDiscoverResult,
  TogglIntegrationSettings,
} from "@timefraim/shared";
import { Bot, LockKeyhole, Orbit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { env } from "@/lib/env";
import { SettingsGoogleCalendarsCard } from "@/pages/settings-google-calendars-card";
import { SettingsTaskEndNotificationsCard } from "@/pages/settings-task-end-notifications-card";
import { SettingsTogglCard } from "@/pages/settings-toggl-card";

export function SettingsPage({
  authSession,
  togglSettings,
  googleCalendarSettings,
  isLoadingGoogleCalendars,
  isSavingGoogleCalendars,
  taskEndNotificationsEnabled,
  taskEndNotificationsSupported,
  taskEndNotificationsMessage,
  onDiscoverToggl,
  onDeleteToggl,
  onSaveToggl,
  onSaveGoogleCalendars,
  onTaskEndNotificationsChange,
  isDiscovering,
  isSaving,
}: {
  authSession: AuthSession;
  togglSettings: TogglIntegrationSettings;
  googleCalendarSettings: GoogleCalendarSettings | null;
  isLoadingGoogleCalendars: boolean;
  isSavingGoogleCalendars: boolean;
  taskEndNotificationsEnabled: boolean;
  taskEndNotificationsSupported: boolean;
  taskEndNotificationsMessage: string | null;
  onDiscoverToggl: (values: TogglDiscoverInput) => Promise<TogglDiscoverResult>;
  onDeleteToggl: () => Promise<TogglIntegrationSettings>;
  onSaveToggl: (values: TogglConnect) => Promise<TogglIntegrationSettings>;
  onSaveGoogleCalendars: (syncCalendarIds: string[]) => Promise<unknown>;
  onTaskEndNotificationsChange: (nextEnabled: boolean) => Promise<void> | void;
  isDiscovering: boolean;
  isSaving: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-[rgba(255,111,59,0.12)] p-3 text-[var(--accent)]">
              <Orbit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Google Calendar</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">Calendar visibility and sync</h1>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm font-medium text-white">Auth status</p>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                {authSession.integrationStatus.googleConnected
                  ? `Connected as ${authSession.integrationStatus.googleEmail}`
                  : "Not connected yet. Sign in with Google from the planner home page."}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="text-sm font-medium text-white">Scope guardrails</p>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                Selected calendars show up as blockers on the timeline. Planner-created blocks go to the planner calendar, and new planner tasks copy to your default Google Tasks list.
              </p>
            </div>
          </div>
          {authSession.integrationStatus.googleConnected && (
            <div className="mt-5">
              <SettingsGoogleCalendarsCard
                settings={googleCalendarSettings}
                isLoading={isLoadingGoogleCalendars}
                isSaving={isSavingGoogleCalendars}
                onSave={onSaveGoogleCalendars}
              />
            </div>
          )}
        </Card>

        <SettingsTogglCard
          togglSettings={togglSettings}
          onDiscoverToggl={onDiscoverToggl}
          onDeleteToggl={onDeleteToggl}
          onSaveToggl={onSaveToggl}
          isDiscovering={isDiscovering}
          isSaving={isSaving}
        />
      </div>

      <div className="space-y-6">
        <SettingsTaskEndNotificationsCard
          enabled={taskEndNotificationsEnabled}
          supported={taskEndNotificationsSupported}
          message={taskEndNotificationsMessage}
          onChange={onTaskEndNotificationsChange}
        />

        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-[rgba(255,255,255,0.08)] p-3 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">MCP access</p>
              <h2 className="mt-1 text-xl font-semibold text-white">ChatGPT and Claude</h2>
            </div>
          </div>
          <div className="space-y-4 text-sm text-[var(--muted-strong)]">
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="font-medium text-white">Remote endpoint</p>
              <p className="mt-2 break-all">{env.apiBaseUrl}/mcp</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/4 p-4">
              <p className="font-medium text-white">Access profiles</p>
              <ul className="mt-2 space-y-2">
                <li>Full access token configured: {authSession.integrationStatus.mcpFullAccessConfigured ? "yes" : "no"}</li>
                <li>Read-only token configured: {authSession.integrationStatus.mcpReadOnlyConfigured ? "yes" : "no"}</li>
                <li>Tunnel base URL: {authSession.integrationStatus.tunnelBaseUrl ?? "not set"}</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-[rgba(255,255,255,0.08)] p-3 text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Guardrails</p>
              <h2 className="mt-1 text-xl font-semibold text-white">What AI can do</h2>
            </div>
          </div>
          <ul className="space-y-3 text-sm text-[var(--muted-strong)]">
            <li>Claude can propose and confirm app-managed schedule changes through the full-access MCP profile.</li>
            <li>ChatGPT Pro should use the read-only profile in v1.</li>
            <li>AI writes land as drafts first, and external Google events stay read-only.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
