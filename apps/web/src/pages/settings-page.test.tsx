import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { SettingsPage } from "@/pages/settings-page";
import { buildAuthSession, buildTogglSettings } from "@/test/fixtures";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
  Toaster: () => null,
}));

describe("SettingsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits Toggl settings and clears the API token field", async () => {
    const user = userEvent.setup();
    const togglSettings = buildTogglSettings({ connected: false, hasSavedToken: false, apiTokenHint: null, workspaceId: null, workspaceName: null, defaultProjectId: null, defaultProjectName: null, availableWorkspaces: [], availableProjects: [], lastValidatedAt: null });
    const onSaveToggl = vi.fn().mockResolvedValue(buildTogglSettings());
    const onDiscoverToggl = vi.fn().mockResolvedValue({
      apiTokenHint: "••••7890",
      selectedWorkspaceId: "workspace-2",
      selectedWorkspaceName: "Personal",
      defaultProjectId: null,
      defaultProjectName: null,
      availableWorkspaces: [{ id: "workspace-2", name: "Personal" }],
      availableProjects: [{ id: "project-7", name: "Deep Work", workspaceId: "workspace-2", active: true }],
    });

    render(
      <SettingsPage
        authSession={buildAuthSession()}
        togglSettings={togglSettings}
        onDiscoverToggl={onDiscoverToggl}
        onDeleteToggl={vi.fn().mockResolvedValue(buildTogglSettings({ connected: false }))}
        onSaveToggl={onSaveToggl}
        isDiscovering={false}
        isSaving={false}
        googleCalendarSettings={null}
        isLoadingGoogleCalendars={false}
        isSavingGoogleCalendars={false}
        onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.type(screen.getByPlaceholderText(/paste toggl api token/i), "test-token");
    await user.click(screen.getByRole("button", { name: /find workspaces/i }));
    await waitFor(() => {
      expect(onDiscoverToggl).toHaveBeenCalledWith({
        apiToken: "test-token",
        workspaceId: null,
      });
    });
    await user.selectOptions(screen.getByLabelText("Toggl workspace"), "workspace-2");
    await user.selectOptions(screen.getByLabelText("Toggl default project"), "project-7");
    await user.click(screen.getByRole("button", { name: /save toggl setup/i }));

    await waitFor(() => {
      expect(onSaveToggl).toHaveBeenCalledWith({
        apiToken: "test-token",
        workspaceId: "workspace-2",
        defaultProjectId: "project-7",
      });
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/paste toggl api token/i)).toHaveValue("");
    });
  });

  it("shows an alert when saving Toggl settings fails", async () => {
    const user = userEvent.setup();
    const toastErrorSpy = vi.mocked(toast.error);
    toastErrorSpy.mockClear();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onSaveToggl = vi.fn().mockRejectedValue(new Error("invalid input syntax for type json"));
    const togglSettings = buildTogglSettings({
      connected: false,
      hasSavedToken: false,
      apiTokenHint: null,
      workspaceId: null,
      workspaceName: null,
      defaultProjectId: null,
      defaultProjectName: null,
      availableWorkspaces: [{ id: "workspace-2", name: "Personal" }],
      availableProjects: [],
      lastValidatedAt: null,
    });

    render(
      <SettingsPage
        authSession={buildAuthSession()}
        togglSettings={togglSettings}
        onDiscoverToggl={vi.fn()}
        onDeleteToggl={vi.fn().mockResolvedValue(buildTogglSettings({ connected: false }))}
        onSaveToggl={onSaveToggl}
        isDiscovering={false}
        isSaving={false}
        googleCalendarSettings={null}
        isLoadingGoogleCalendars={false}
        isSavingGoogleCalendars={false}
        onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.type(screen.getByPlaceholderText(/paste toggl api token/i), "test-token");
    await user.selectOptions(screen.getByLabelText("Toggl workspace"), "workspace-2");
    await user.click(screen.getByRole("button", { name: /save toggl setup/i }));

    await waitFor(() => {
      expect(onSaveToggl).toHaveBeenCalledWith({
        apiToken: "test-token",
        workspaceId: "workspace-2",
        defaultProjectId: null,
      });
    });
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Failed to save the Toggl setup. Please try again.",
        { duration: 8000 },
      );
    });
    expect(consoleSpy).toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/paste toggl api token/i)).toHaveValue("test-token");
  });
});
