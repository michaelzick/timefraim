import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { buildAuthSession, buildDayPlan, buildTogglSettings, noopDuplicate } from "@/test/fixtures";
import { ThemeProvider } from "@/theme/theme-provider";

function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

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
      <Providers>
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
            taskStartNotificationsEnabled={false}
            taskEndNotificationsEnabled={false}
            taskNotificationsSupported
            taskNotificationsMessage={null}
            onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
            onTaskStartNotificationsChange={vi.fn()}
            onTaskEndNotificationsChange={vi.fn()}
            plannerPageProps={{
              isMutating: false,
              isSyncing: false,
              onCreateScheduleBlock: noopAsync,
              onCreateTask: noopAsync,
              onDeleteScheduleBlock: noopAsync,
              onDeleteTask: noopAsync,
              onDismissCalendarEvent: noopAsync,
              onUpdateCalendarEvent: noopAsync,
              onDuplicateTask: noopDuplicate,
              onDuplicateScheduleBlock: noopDuplicate,
              onStartTimer: noopAsync,
              onStartEventTimer: noopAsync,
              onStopTimer: noopAsync,
              onSyncCalendar: noopAsync,
              onUpdateScheduleBlock: noopAsync,
              onUpdateTask: noopAsync,
              togglSettings: buildTogglSettings(),
            }}
          />
        </MemoryRouter>
      </Providers>,
    );

    expect(screen.queryByText(/synced with allowed@example.com/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument();
    expect(screen.queryByText(/allowlisted for allowed@example.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/calendar-aware daily planning with guarded ai writes/i)).not.toBeInTheDocument();
    expect(await screen.findByText("settings route")).toBeInTheDocument();
  });
});
