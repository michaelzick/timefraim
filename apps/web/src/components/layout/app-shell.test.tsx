import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { buildAuthSession, buildDayPlan, buildTogglSettings } from "@/test/fixtures";

vi.mock("@/pages/planner-page", () => ({
  PlannerPage: () => <div>planner route</div>,
}));

vi.mock("@/pages/settings-page", () => ({
  SettingsPage: () => <div>settings route</div>,
}));

const noopAsync = () => Promise.resolve(undefined);
const noopDiscover = () =>
  Promise.resolve({
    apiTokenHint: "••••7890",
    selectedWorkspaceId: "workspace-1",
    selectedWorkspaceName: "Personal",
    defaultProjectId: null,
    defaultProjectName: null,
    availableWorkspaces: [{ id: "workspace-1", name: "Personal" }],
    availableProjects: [],
  });
const noopTogglSettings = () => Promise.resolve(buildTogglSettings());

describe("AppShell", () => {
  it("renders the signed-in shell and lazy route content", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <AppShell
          authSession={buildAuthSession()}
          date="2026-04-06"
          dayPlan={buildDayPlan()}
          togglSettings={buildTogglSettings()}
          isDiscoveringToggl={false}
          isSavingToggl={false}
          onDateChange={vi.fn()}
          onDiscoverToggl={noopDiscover}
          onDeleteToggl={noopTogglSettings}
          onSaveToggl={noopTogglSettings}
          onSignOut={vi.fn()}
          googleCalendarSettings={null}
          isLoadingGoogleCalendars={false}
          isSavingGoogleCalendars={false}
          onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
          plannerPageProps={{
            isMutating: false,
            isSyncing: false,
            onConfirmDraft: noopAsync,
            onCreateScheduleBlock: noopAsync,
            onCreateTask: noopAsync,
            onDeleteScheduleBlock: noopAsync,
            onDeleteTask: noopAsync,
            onDismissCalendarEvent: noopAsync,
            onRejectDraft: noopAsync,
            onStartTimer: noopAsync,
            onStartEventTimer: noopAsync,
            onStopTimer: noopAsync,
            onSyncCalendar: noopAsync,
            onUpdateScheduleBlock: noopAsync,
            onUpdateTask: noopAsync,
            togglSettings: buildTogglSettings(),
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/synced with allowed@example.com/i)).toBeInTheDocument();
    expect(screen.queryByText(/allowlisted for allowed@example.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/calendar-aware daily planning with guarded ai writes/i)).not.toBeInTheDocument();
    expect(await screen.findByText("settings route")).toBeInTheDocument();
  });
});
