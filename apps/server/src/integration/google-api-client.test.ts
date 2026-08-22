import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.ts", () => ({
  env: {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
  },
}));

import { createGoogleClient, GoogleApiError, googleUrl, type GoogleConnection } from "./google-api-client.ts";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function connection(overrides: Partial<GoogleConnection> = {}): GoogleConnection {
  return {
    accessToken: "stale-token",
    refreshToken: "refresh-token",
    expiresAt: "2099-01-01T00:00:00.000Z",
    calendarId: "primary",
    plannerCalendarId: "Free Time Tasks",
    email: "allowed@example.com",
    ...overrides,
  };
}

function sentAuthHeaders() {
  return fetchMock.mock.calls.map(([, init]) => (init?.headers as Record<string, string> | undefined)?.Authorization);
}

describe("google api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("builds encoded urls and drops empty query values", () => {
    expect(googleUrl("https://example.com/v1", ["lists", "@default", "tasks"], { pageToken: undefined, showHidden: true })).toBe(
      "https://example.com/v1/lists/@default/tasks?showHidden=true",
    );
  });

  it("returns null without a connection", () => {
    expect(createGoogleClient(null)).toBeNull();
  });

  it("sends the bearer token and returns parsed json", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "evt-1" }));

    const client = createGoogleClient(connection())!;
    const result = await client.request<{ id: string }>("GET", "https://example.com/v1/resource");

    expect(result).toEqual({ id: "evt-1" });
    expect(sentAuthHeaders()).toEqual(["Bearer stale-token"]);
  });

  it("refreshes once on 401, retries, and reports the new token", async () => {
    const onTokensRefreshed = vi.fn();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { code: 401, message: "Invalid Credentials" } }, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token", expires_in: 3600 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = createGoogleClient(connection({ onTokensRefreshed }))!;
    const result = await client.request("DELETE", "https://example.com/v1/resource");

    expect(result).toBeNull();
    const [, tokenCall] = fetchMock.mock.calls;
    const tokenBody = tokenCall?.[1]?.body;
    expect(tokenCall?.[0]).toBe("https://oauth2.googleapis.com/token");
    expect(tokenBody).toBeInstanceOf(URLSearchParams);
    expect((tokenBody as URLSearchParams).get("grant_type")).toBe("refresh_token");
    expect(sentAuthHeaders()).toEqual(["Bearer stale-token", undefined, "Bearer fresh-token"]);
    expect(onTokensRefreshed).toHaveBeenCalledWith({ accessToken: "fresh-token", expiresAt: expect.any(String) });
  });

  it("refreshes before the request when the stored expiry is imminent", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const client = createGoogleClient(connection({ expiresAt: new Date(Date.now() + 30_000).toISOString() }))!;
    await client.request("GET", "https://example.com/v1/resource");

    expect(sentAuthHeaders()).toEqual([undefined, "Bearer fresh-token"]);
  });

  it("does not attempt a refresh without a refresh token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: "Invalid Credentials" } }, 401));

    const client = createGoogleClient(connection({ refreshToken: null, expiresAt: "2000-01-01T00:00:00.000Z" }))!;

    await expect(client.request("GET", "https://example.com/v1/resource")).rejects.toMatchObject({
      status: 401,
      code: 401,
      message: "Invalid Credentials",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces Google error messages with the HTTP status", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: 403, message: "Google Tasks API has not been used in project 1 before or it is disabled." } }, 403),
    );

    const client = createGoogleClient(connection())!;
    const failure = await client.request("GET", "https://example.com/v1/resource").catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GoogleApiError);
    expect(failure).toMatchObject({ status: 403, code: 403 });
    expect((failure as Error).message).toContain("has not been used");
  });
});
