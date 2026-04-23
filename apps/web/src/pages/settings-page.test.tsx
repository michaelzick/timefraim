import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { SettingsPage } from "@/pages/settings-page";
import { buildAuthSession, buildOpenAiImageSettings, buildTogglSettings } from "@/test/fixtures";

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

  it("shows the public MCP endpoint that Claude and ChatGPT should use", () => {
    render(
      <SettingsPage
        authSession={buildAuthSession()}
        togglSettings={buildTogglSettings()}
        openAiImageSettings={buildOpenAiImageSettings()}
        onDiscoverToggl={vi.fn()}
        onDeleteToggl={vi.fn().mockResolvedValue(buildTogglSettings({ connected: false }))}
        onDeleteOpenAiConnection={vi.fn().mockResolvedValue(buildOpenAiImageSettings({ connected: false, apiKeyHint: null }))}
        onGenerateOpenAiImage={vi.fn()}
        onSaveOpenAiConnection={vi.fn()}
        onSaveToggl={vi.fn().mockResolvedValue(buildTogglSettings())}
        isDiscovering={false}
        isSaving={false}
        googleCalendarSettings={null}
        isLoadingGoogleCalendars={false}
        isLoadingOpenAiImageSettings={false}
        isSavingGoogleCalendars={false}
        isSavingOpenAiImage={false}
        isGeneratingOpenAiImage={false}
        onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
        taskEndNotificationsEnabled={false}
        taskEndNotificationsSupported
        taskEndNotificationsMessage={null}
        onTaskEndNotificationsChange={vi.fn()}
      />,
    );

    expect(screen.getByText("https://example.ngrok.app/mcp")).toBeInTheDocument();
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
        openAiImageSettings={buildOpenAiImageSettings()}
        onDiscoverToggl={onDiscoverToggl}
        onDeleteToggl={vi.fn().mockResolvedValue(buildTogglSettings({ connected: false }))}
        onDeleteOpenAiConnection={vi.fn().mockResolvedValue(buildOpenAiImageSettings({ connected: false, apiKeyHint: null }))}
        onGenerateOpenAiImage={vi.fn()}
        onSaveOpenAiConnection={vi.fn()}
        onSaveToggl={onSaveToggl}
        isDiscovering={false}
        isSaving={false}
        googleCalendarSettings={null}
        isLoadingGoogleCalendars={false}
        isLoadingOpenAiImageSettings={false}
        isSavingGoogleCalendars={false}
        isSavingOpenAiImage={false}
        isGeneratingOpenAiImage={false}
        onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
        taskEndNotificationsEnabled={false}
        taskEndNotificationsSupported
        taskEndNotificationsMessage={null}
        onTaskEndNotificationsChange={vi.fn()}
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
        openAiImageSettings={buildOpenAiImageSettings()}
        onDiscoverToggl={vi.fn()}
        onDeleteToggl={vi.fn().mockResolvedValue(buildTogglSettings({ connected: false }))}
        onDeleteOpenAiConnection={vi.fn().mockResolvedValue(buildOpenAiImageSettings({ connected: false, apiKeyHint: null }))}
        onGenerateOpenAiImage={vi.fn()}
        onSaveOpenAiConnection={vi.fn()}
        onSaveToggl={onSaveToggl}
        isDiscovering={false}
        isSaving={false}
        googleCalendarSettings={null}
        isLoadingGoogleCalendars={false}
        isLoadingOpenAiImageSettings={false}
        isSavingGoogleCalendars={false}
        isSavingOpenAiImage={false}
        isGeneratingOpenAiImage={false}
        onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
        taskEndNotificationsEnabled={false}
        taskEndNotificationsSupported
        taskEndNotificationsMessage={null}
        onTaskEndNotificationsChange={vi.fn()}
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

  it("renders the saved task-end pop-up preference and forwards checkbox changes", async () => {
    const user = userEvent.setup();
    const onTaskEndNotificationsChange = vi.fn();

    render(
      <SettingsPage
        authSession={buildAuthSession()}
        togglSettings={buildTogglSettings()}
        openAiImageSettings={buildOpenAiImageSettings()}
        onDiscoverToggl={vi.fn()}
        onDeleteToggl={vi.fn().mockResolvedValue(buildTogglSettings({ connected: false }))}
        onDeleteOpenAiConnection={vi.fn().mockResolvedValue(buildOpenAiImageSettings({ connected: false, apiKeyHint: null }))}
        onGenerateOpenAiImage={vi.fn()}
        onSaveOpenAiConnection={vi.fn()}
        onSaveToggl={vi.fn().mockResolvedValue(buildTogglSettings())}
        isDiscovering={false}
        isSaving={false}
        googleCalendarSettings={null}
        isLoadingGoogleCalendars={false}
        isLoadingOpenAiImageSettings={false}
        isSavingGoogleCalendars={false}
        isSavingOpenAiImage={false}
        isGeneratingOpenAiImage={false}
        onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
        taskEndNotificationsEnabled
        taskEndNotificationsSupported
        taskEndNotificationsMessage={null}
        onTaskEndNotificationsChange={onTaskEndNotificationsChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /show browser pop-ups when a task ends/i });
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(onTaskEndNotificationsChange).toHaveBeenCalledWith(false);
  });

  it("submits an OpenAI image prompt and renders the returned preview", async () => {
    const user = userEvent.setup();
    const onGenerateOpenAiImage = vi.fn().mockResolvedValue({
      imageBase64: "base64-image-data",
      mimeType: "image/png",
      revisedPrompt: "Refined prompt",
      model: "gpt-image-2",
    });

    render(
      <SettingsPage
        authSession={buildAuthSession()}
        togglSettings={buildTogglSettings()}
        openAiImageSettings={buildOpenAiImageSettings()}
        onDiscoverToggl={vi.fn()}
        onDeleteToggl={vi.fn().mockResolvedValue(buildTogglSettings({ connected: false }))}
        onDeleteOpenAiConnection={vi.fn().mockResolvedValue(buildOpenAiImageSettings({ connected: false, apiKeyHint: null }))}
        onGenerateOpenAiImage={onGenerateOpenAiImage}
        onSaveOpenAiConnection={vi.fn()}
        onSaveToggl={vi.fn().mockResolvedValue(buildTogglSettings())}
        isDiscovering={false}
        isSaving={false}
        googleCalendarSettings={null}
        isLoadingGoogleCalendars={false}
        isLoadingOpenAiImageSettings={false}
        isSavingGoogleCalendars={false}
        isSavingOpenAiImage={false}
        isGeneratingOpenAiImage={false}
        onSaveGoogleCalendars={vi.fn().mockResolvedValue(undefined)}
        taskEndNotificationsEnabled={false}
        taskEndNotificationsSupported
        taskEndNotificationsMessage={null}
        onTaskEndNotificationsChange={vi.fn()}
      />,
    );

    await user.clear(screen.getByPlaceholderText(/describe the image/i));
    await user.type(screen.getByPlaceholderText(/describe the image/i), "Paint a sunrise over the ocean.");
    await user.click(screen.getByRole("button", { name: /generate preview/i }));

    await waitFor(() => {
      expect(onGenerateOpenAiImage).toHaveBeenCalledWith("Paint a sunrise over the ocean.");
    });
    expect(screen.getByAltText("Generated GPT Image 2 preview")).toBeInTheDocument();
    expect(screen.getByText(/revised prompt:/i)).toBeInTheDocument();
  });
});
