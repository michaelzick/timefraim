import { describe, expect, it } from "vitest";
import { createOriginPolicy, isLocalSupabaseUrl } from "./cors-policy.ts";

describe("cors policy", () => {
  const production = createOriginPolicy({ allowedOrigins: ["https://app.example.com"], allowLocalOrigins: false });
  const development = createOriginPolicy({ allowedOrigins: ["https://app.example.com"], allowLocalOrigins: true });

  it("allows configured origins and non-browser requests", () => {
    expect(production("https://app.example.com")).toBe(true);
    expect(production(undefined)).toBe(true);
  });

  it("rejects foreign origins", () => {
    expect(production("https://evil.example.com")).toBe(false);
    expect(production("http://127.0.0.1:6173")).toBe(false);
  });

  it("allows http localhost origins only when local origins are enabled", () => {
    expect(development("http://127.0.0.1:6173")).toBe(true);
    expect(development("http://localhost:6173")).toBe(true);
    expect(development("https://localhost.evil.example.com")).toBe(false);
  });

  it("detects local Supabase stacks by hostname", () => {
    expect(isLocalSupabaseUrl("http://127.0.0.1:55331")).toBe(true);
    expect(isLocalSupabaseUrl("http://kong:8000")).toBe(true);
    expect(isLocalSupabaseUrl("https://abc.supabase.co")).toBe(false);
    expect(isLocalSupabaseUrl("not a url")).toBe(false);
  });
});
