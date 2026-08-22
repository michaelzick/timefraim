import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.ts", () => ({
  env: {
    MCP_BEARER_TOKEN: "full-access-token-0123456789",
    MCP_READ_ONLY_TOKEN: "read-only-token-0123456789",
    SUPABASE_URL: "http://127.0.0.1:55331",
    SUPABASE_JWT_SECRET: "",
    ALLOWED_EMAIL: "you@example.com",
  },
}));

import { AuthenticationError, requireMcpProfile, secureEquals } from "./auth.ts";

describe("secureEquals", () => {
  it("matches identical strings", () => {
    expect(secureEquals("abc", "abc")).toBe(true);
    expect(secureEquals("", "")).toBe(true);
    expect(secureEquals("héllo✓", "héllo✓")).toBe(true);
  });

  it("rejects different strings of equal and different length", () => {
    expect(secureEquals("abc", "abd")).toBe(false);
    expect(secureEquals("abc", "abcd")).toBe(false);
    expect(secureEquals("abcd", "abc")).toBe(false);
    expect(secureEquals("", "a")).toBe(false);
  });

  it("rejects a candidate that is a prefix or suffix of the expected value", () => {
    expect(secureEquals("full-access-token", "full-access-token-0123456789")).toBe(false);
    expect(secureEquals("0123456789", "full-access-token-0123456789")).toBe(false);
  });
});

describe("requireMcpProfile", () => {
  it("resolves the profile for each configured token", () => {
    expect(requireMcpProfile("Bearer full-access-token-0123456789")).toBe("full-access");
    expect(requireMcpProfile("Bearer read-only-token-0123456789")).toBe("read-only");
  });

  it("rejects missing, malformed, partial, and unknown tokens", () => {
    expect(() => requireMcpProfile(undefined)).toThrow(AuthenticationError);
    expect(() => requireMcpProfile("full-access-token-0123456789")).toThrow(AuthenticationError);
    expect(() => requireMcpProfile("Bearer full-access-token")).toThrow(AuthenticationError);
    expect(() => requireMcpProfile("Bearer full-access-token-0123456789x")).toThrow(AuthenticationError);
    expect(() => requireMcpProfile("Bearer nope")).toThrow("Invalid MCP bearer token");
  });
});
