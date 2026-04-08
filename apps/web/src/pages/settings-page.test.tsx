import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsPage } from "@/pages/settings-page";
import { buildAuthSession } from "@/test/fixtures";

describe("SettingsPage", () => {
  it("submits Toggl settings and clears the API token field", async () => {
    const user = userEvent.setup();
    const onSaveToggl = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsPage authSession={buildAuthSession()} onSaveToggl={onSaveToggl} isSaving={false} />,
    );

    await user.type(screen.getByPlaceholderText("API token"), "test-token");
    await user.clear(screen.getByPlaceholderText("Workspace ID"));
    await user.type(screen.getByPlaceholderText("Workspace ID"), "workspace-2");
    await user.type(screen.getByPlaceholderText("Default project ID"), "project-7");
    await user.click(screen.getByRole("button", { name: /save toggl access/i }));

    await waitFor(() => {
      expect(onSaveToggl).toHaveBeenCalledWith({
        apiToken: "test-token",
        workspaceId: "workspace-2",
        defaultProjectId: "project-7",
      });
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("API token")).toHaveValue("");
    });
  });
});
