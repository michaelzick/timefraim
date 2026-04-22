import type { TogglDiscoverResult, TogglIntegrationSettings } from "@timefraim/shared";
import { Cable } from "lucide-react";
import type { UseFormRegister } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TogglFormValues = {
  apiToken: string;
  workspaceId: string;
  defaultProjectId: string;
};

export function getWorkspaceOptions(togglSettings: TogglIntegrationSettings, discovery: TogglDiscoverResult | null) {
  return discovery?.availableWorkspaces.length ? discovery.availableWorkspaces : togglSettings.availableWorkspaces;
}

export function getProjectOptions(
  togglSettings: TogglIntegrationSettings,
  discovery: TogglDiscoverResult | null,
  workspaceId: string,
) {
  if (discovery && discovery.selectedWorkspaceId === workspaceId) {
    return discovery.availableProjects;
  }

  if (togglSettings.workspaceId === workspaceId) {
    return togglSettings.availableProjects;
  }

  return [];
}

export function SettingsTogglIntro() {
  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-[rgba(121,137,255,0.14)] p-3 text-[#9eadff]">
          <Cable className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Toggl Track</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--heading)]">Timer connection</h2>
        </div>
      </div>

      <div className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--muted-strong)]">
        <p className="font-medium text-[var(--heading)]">What you need</p>
        <p className="mt-2">
          Add a Toggl Track API token, choose a workspace, then optionally set a workspace default project. TimeFraim
          stores the token encrypted and only shows the masked ending on future visits.
        </p>
        <div className="mt-3 space-y-2">
          <p>
            Get your token from{" "}
            <a className="text-[#9eadff] underline" href="https://track.toggl.com/profile" target="_blank" rel="noreferrer">
              Toggl Profile
            </a>
            .
          </p>
          <p>
            Reference docs:{" "}
            <a className="text-[#9eadff] underline" href="https://engineering.toggl.com/docs/track/" target="_blank" rel="noreferrer">
              engineering.toggl.com/docs/track
            </a>
          </p>
          <p>Examples: workspace "Personal", default project "Deep Work", task project "Client X / Bugfix".</p>
        </div>
      </div>
    </>
  );
}

export function SettingsTogglConnectionState({
  togglSettings,
  shouldShowTokenInput,
  register,
}: {
  togglSettings: TogglIntegrationSettings;
  shouldShowTokenInput: boolean;
  register: UseFormRegister<TogglFormValues>;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Badge>{togglSettings.connected ? "Connected" : "Awaiting setup"}</Badge>
        {togglSettings.apiTokenHint ? <Badge>{togglSettings.apiTokenHint}</Badge> : null}
        {togglSettings.workspaceName ? <Badge>{togglSettings.workspaceName}</Badge> : null}
        {togglSettings.defaultProjectName ? <Badge>{togglSettings.defaultProjectName}</Badge> : null}
      </div>

      {shouldShowTokenInput ? (
        <div className="space-y-2">
          <Input
            placeholder="Paste Toggl API token (example: 1234abcd5678efgh)"
            type="password"
            autoComplete="new-password"
            {...register("apiToken")}
          />
          <p className="text-xs text-[var(--muted)]">
            The raw token is used only to validate against Toggl and is never returned to the browser after save.
          </p>
        </div>
      ) : (
        <div className="rounded-[20px] border border-[var(--panel-border)] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--muted-strong)]">
          Saved token: <span className="text-[var(--heading)]">{togglSettings.apiTokenHint}</span>
        </div>
      )}
    </>
  );
}

export function SettingsTogglActions({
  togglSettings,
  shouldShowTokenInput,
  replaceToken,
  isDiscovering,
  isSaving,
  watchedApiToken,
  watchedWorkspaceId,
  needsFreshCatalog,
  onDiscover,
  onRefreshCatalog,
  onReplaceToken,
  onDisconnect,
}: {
  togglSettings: TogglIntegrationSettings;
  shouldShowTokenInput: boolean;
  replaceToken: boolean;
  isDiscovering: boolean;
  isSaving: boolean;
  watchedApiToken: string;
  watchedWorkspaceId: string;
  needsFreshCatalog: boolean;
  onDiscover: () => void;
  onRefreshCatalog: () => void;
  onReplaceToken: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {shouldShowTokenInput ? (
        <Button
          type="button"
          variant="secondary"
          disabled={isDiscovering || watchedApiToken.trim().length === 0}
          onClick={onDiscover}
        >
          Find workspaces
        </Button>
      ) : (
        <Button type="button" variant="secondary" disabled={isSaving || !watchedWorkspaceId} onClick={onRefreshCatalog}>
          Refresh catalog
        </Button>
      )}
      <Button
        disabled={
          isSaving
          || !watchedWorkspaceId
          || (shouldShowTokenInput && watchedApiToken.trim().length === 0)
          || needsFreshCatalog
        }
      >
        Save Toggl setup
      </Button>
      {togglSettings.hasSavedToken && !replaceToken ? (
        <Button type="button" variant="secondary" disabled={isSaving} onClick={onReplaceToken}>
          Replace token
        </Button>
      ) : null}
      {togglSettings.connected ? (
        <Button type="button" variant="secondary" disabled={isSaving} onClick={onDisconnect}>
          Disconnect
        </Button>
      ) : null}
    </div>
  );
}

export function getTogglStatusNote(args: {
  togglSettings: TogglIntegrationSettings;
  discovery: TogglDiscoverResult | null;
  projectCount: number;
  needsFreshCatalog: boolean;
}) {
  if (args.needsFreshCatalog) {
    return "You changed the workspace. Refresh the catalog with your saved token before choosing the default project.";
  }

  if (args.discovery) {
    return `Discovered ${args.discovery.availableWorkspaces.length} workspaces and ${args.projectCount} projects for the selected workspace.`;
  }

  if (args.togglSettings.lastValidatedAt) {
    return `Last validated ${new Date(args.togglSettings.lastValidatedAt).toLocaleString()}.`;
  }

  return "Discover workspaces after entering a token, then save the connection.";
}
