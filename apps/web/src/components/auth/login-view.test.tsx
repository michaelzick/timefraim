import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { signInWithOAuth } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithOAuth,
    },
  },
}));

import { LoginView } from "@/components/auth/login-view";

describe("LoginView", () => {
  it("starts the Google OAuth flow", async () => {
    const user = userEvent.setup();
    render(<LoginView />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            scopes: expect.stringContaining("https://www.googleapis.com/auth/tasks"),
          }),
        }),
      );
    });
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeDisabled();
  });
});
