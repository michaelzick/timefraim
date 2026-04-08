import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { buildAuthSession, buildDayPlan } from "@/test/fixtures";

vi.mock("@/pages/planner-page", () => ({
  PlannerPage: () => <div>planner route</div>,
}));

vi.mock("@/pages/settings-page", () => ({
  SettingsPage: () => <div>settings route</div>,
}));

const noopAsync = () => Promise.resolve(undefined);

describe("AppShell", () => {
  it("renders the signed-in shell and lazy route content", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <AppShell
          authSession={buildAuthSession()}
          date="2026-04-06"
          dayPlan={buildDayPlan()}
          isSavingToggl={false}
          onDateChange={vi.fn()}
          onSaveToggl={noopAsync}
          onSignOut={vi.fn()}
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
            onStopTimer: noopAsync,
            onSyncCalendar: noopAsync,
            onUpdateScheduleBlock: noopAsync,
            onUpdateTask: noopAsync,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/allowlisted for allowed@example.com/i)).toBeInTheDocument();
    expect(await screen.findByText("settings route")).toBeInTheDocument();
  });
});
