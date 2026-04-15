import type {
  TogglConnect,
  TogglDiscoverInput,
  TogglDiscoverResult,
  TogglIntegrationSettings,
} from "@timefraim/shared";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { showActionError } from "@/features/planner/planner-page-utils";
import {
  getTogglStatusNote,
  getProjectOptions,
  getWorkspaceOptions,
  SettingsTogglActions,
  SettingsTogglConnectionState,
  SettingsTogglIntro,
  type TogglFormValues,
} from "@/pages/settings-toggl-sections";

export function SettingsTogglCard({
  togglSettings,
  onDiscoverToggl,
  onDeleteToggl,
  onSaveToggl,
  isDiscovering,
  isSaving,
}: {
  togglSettings: TogglIntegrationSettings;
  onDiscoverToggl: (values: TogglDiscoverInput) => Promise<TogglDiscoverResult>;
  onDeleteToggl: () => Promise<TogglIntegrationSettings>;
  onSaveToggl: (values: TogglConnect) => Promise<TogglIntegrationSettings>;
  isDiscovering: boolean;
  isSaving: boolean;
}) {
  const [discovery, setDiscovery] = useState<TogglDiscoverResult | null>(null);
  const [replaceToken, setReplaceToken] = useState(false);
  const togglForm = useForm<TogglFormValues>({
    defaultValues: {
      apiToken: "",
      workspaceId: togglSettings.workspaceId ?? "",
      defaultProjectId: togglSettings.defaultProjectId ?? "",
    },
  });
  const watchedWorkspaceId = togglForm.watch("workspaceId");
  const watchedApiToken = togglForm.watch("apiToken");
  const workspaceOptions = useMemo(() => getWorkspaceOptions(togglSettings, discovery), [discovery, togglSettings]);
  const projectOptions = useMemo(
    () => getProjectOptions(togglSettings, discovery, watchedWorkspaceId),
    [discovery, togglSettings, watchedWorkspaceId],
  );
  const shouldShowTokenInput = !togglSettings.hasSavedToken || replaceToken || !togglSettings.connected;
  const needsFreshCatalog = Boolean(
    togglSettings.connected && watchedWorkspaceId && togglSettings.workspaceId && watchedWorkspaceId !== togglSettings.workspaceId,
  );

  function resetFormValues(values: { workspaceId?: string | null; defaultProjectId?: string | null }) {
    togglForm.reset({
      apiToken: "",
      workspaceId: values.workspaceId ?? "",
      defaultProjectId: values.defaultProjectId ?? "",
    });
  }

  async function runTogglAction(action: () => Promise<void>, message: string) {
    try {
      await action();
    } catch (error) {
      showActionError(message, error);
    }
  }

  useEffect(() => {
    togglForm.reset({
      apiToken: "",
      workspaceId: togglSettings.workspaceId ?? "",
      defaultProjectId: togglSettings.defaultProjectId ?? "",
    });
    if (togglSettings.connected) {
      setDiscovery(null);
      setReplaceToken(false);
    }
  }, [
    togglForm,
    togglSettings.connected,
    togglSettings.defaultProjectId,
    togglSettings.workspaceId,
  ]);

  async function handleDiscover() {
    await runTogglAction(async () => {
      const values = togglForm.getValues();
      const result = await onDiscoverToggl({
        apiToken: values.apiToken,
        workspaceId: values.workspaceId || null,
      });
      setDiscovery(result);
      togglForm.setValue("workspaceId", result.selectedWorkspaceId ?? "");
      togglForm.setValue("defaultProjectId", "");
    }, "Failed to discover Toggl workspaces. Please try again.");
  }

  async function handleSave(values: TogglFormValues) {
    await runTogglAction(async () => {
      const result = await onSaveToggl({
        apiToken: values.apiToken.trim() ? values.apiToken.trim() : null,
        workspaceId: values.workspaceId,
        defaultProjectId: values.defaultProjectId || null,
      });
      setDiscovery(null);
      setReplaceToken(false);
      resetFormValues(result);
    }, "Failed to save the Toggl setup. Please try again.");
  }

  async function handleRefreshCatalog() {
    await runTogglAction(async () => {
      const values = togglForm.getValues();
      const result = await onSaveToggl({
        workspaceId: values.workspaceId,
        defaultProjectId: needsFreshCatalog ? null : values.defaultProjectId || null,
      });
      setDiscovery(null);
      resetFormValues(result);
    }, "Failed to refresh the Toggl catalog. Please try again.");
  }

  async function handleDisconnect() {
    await runTogglAction(async () => {
      await onDeleteToggl();
      setDiscovery(null);
      setReplaceToken(false);
      resetFormValues({});
    }, "Failed to disconnect Toggl. Please try again.");
  }

  return (
    <Card>
      <div className="space-y-4">
        <SettingsTogglIntro />

        <form className="space-y-4" onSubmit={togglForm.handleSubmit(handleSave)}>
          <SettingsTogglConnectionState
            togglSettings={togglSettings}
            shouldShowTokenInput={shouldShowTokenInput}
            register={togglForm.register}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <select
              aria-label="Toggl workspace"
              className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)]"
              {...togglForm.register("workspaceId")}
            >
              <option value="" className="bg-[var(--panel)]">
                {workspaceOptions.length ? "Choose a workspace" : "Discover a workspace first"}
              </option>
              {workspaceOptions.map((workspace) => (
                <option key={workspace.id} value={workspace.id} className="bg-[var(--panel)]">
                  {workspace.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Toggl default project"
              className="h-11 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!watchedWorkspaceId}
              {...togglForm.register("defaultProjectId")}
            >
              <option value="" className="bg-[var(--panel)]">
                {needsFreshCatalog
                  ? "Refresh catalog after changing workspace"
                  : projectOptions.length
                    ? "No workspace default project"
                    : "No saved projects for this workspace"}
              </option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id} className="bg-[var(--panel)]">
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <SettingsTogglActions
            togglSettings={togglSettings}
            shouldShowTokenInput={shouldShowTokenInput}
            replaceToken={replaceToken}
            isDiscovering={isDiscovering}
            isSaving={isSaving}
            watchedApiToken={watchedApiToken}
            watchedWorkspaceId={watchedWorkspaceId}
            needsFreshCatalog={needsFreshCatalog}
            onDiscover={() => void handleDiscover()}
            onRefreshCatalog={() => void handleRefreshCatalog()}
            onReplaceToken={() => setReplaceToken(true)}
            onDisconnect={() => void handleDisconnect()}
          />

          <p className="text-xs text-[var(--muted)]">
            {getTogglStatusNote({
              togglSettings,
              discovery,
              projectCount: projectOptions.length,
              needsFreshCatalog,
            })}
          </p>
        </form>
      </div>
    </Card>
  );
}
