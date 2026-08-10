import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ api: {} }));
vi.mock("@/lib/env", () => ({ env: { allowedEmail: "user@example.com" } }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {} } }));

import { isGoogleTaskSyncRoute } from "@/hooks/use-app-shell-data";

describe("isGoogleTaskSyncRoute", () => {
  it.each([
    ["/", true],
    ["/board", true],
    ["/settings", false],
    ["/board/other", false],
  ])("returns %s → %s", (pathname, expected) => {
    expect(isGoogleTaskSyncRoute(pathname)).toBe(expected);
  });
});
