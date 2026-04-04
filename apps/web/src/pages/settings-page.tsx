import { useForm } from "react-hook-form";
import type { AuthSession } from "@timefraim/shared";
import { Bot, Cable, LockKeyhole, Orbit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TogglFormValues = {
  apiToken: string;
  workspaceId: string;
  defaultProjectId: string;
};

export function SettingsPage({
  authSession,
  onSaveToggl,
  isSaving,
}: {
  authSession: AuthSession;
  onSaveToggl: (values: TogglFormValues) => Promise<void>;
  isSaving: boolean;
}) {
  const togglForm = useForm<TogglFormValues>({
    defaultValues: {
      apiToken: "",
      workspaceId: authSession.integrationStatus.togglWorkspaceId ?? "",
      defaultProjectId: "",
    },
  });

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
                Only the primary Google Calendar is synced. Non-app events stay read-only blockers, while app-managed events can be updated.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-[rgba(121,137,255,0.14)] p-3 text-[#9eadff]">
              <Cable className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Toggl Track</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Timer connection</h2>
            </div>
          </div>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={togglForm.handleSubmit(async (values) => {
              await onSaveToggl(values);
              togglForm.reset({ ...values, apiToken: "" });
            })}
          >
            <Input placeholder="API token" type="password" {...togglForm.register("apiToken")} />
            <Input placeholder="Workspace ID" {...togglForm.register("workspaceId")} />
            <Input placeholder="Default project ID" {...togglForm.register("defaultProjectId")} />
            <div className="flex items-center">
              <Button disabled={isSaving}>
                Save Toggl access
              </Button>
            </div>
          </form>
          <div className="mt-4">
            <Badge>{authSession.integrationStatus.togglConnected ? "Connected" : "Awaiting token"}</Badge>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
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
              <p className="mt-2 break-all">{import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/mcp</p>
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
