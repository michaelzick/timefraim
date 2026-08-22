import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.ts", () => ({
  env: {
    INTEGRATION_ENCRYPTION_KEY: "google-token-test-key",
    GOOGLE_CALENDAR_ID: "primary",
    GOOGLE_PLANNER_CALENDAR_ID: "Free Time Tasks",
    ALLOWED_EMAIL: "allowed@example.com",
  },
}));
vi.mock("../db/pool.ts", () => ({ pool: {} }));

import { decryptSecret, encryptSecret } from "../integration/integration-crypto.ts";
import type { IntegrationTokenRow } from "../repositories/planner-repository-types.ts";
import {
  GOOGLE_TOKEN_ENCRYPTION,
  getGoogleConnection,
  readGoogleConnection,
} from "./planner-service-google-tokens.ts";

function createRepository(row: IntegrationTokenRow | null) {
  return {
    getIntegrationToken: vi.fn().mockResolvedValue(row),
    upsertIntegrationToken: vi.fn().mockResolvedValue(undefined),
  };
}

function legacyRow(): IntegrationTokenRow {
  return {
    provider: "google",
    access_token: "plain-access",
    refresh_token: "plain-refresh",
    expires_at: "2026-04-16T12:00:00.000Z",
    metadata: { email: "allowed@example.com", calendarId: "primary" },
  };
}

async function encryptedRow(): Promise<IntegrationTokenRow> {
  return {
    provider: "google",
    access_token: await encryptSecret("plain-access"),
    refresh_token: await encryptSecret("plain-refresh"),
    expires_at: "2026-04-16T12:00:00.000Z",
    metadata: { email: "allowed@example.com", tokenEncryption: GOOGLE_TOKEN_ENCRYPTION },
  };
}

type StoredTokens = { accessToken: string; refreshToken: string | null; expiresAt: string | null; metadata: Record<string, unknown> };

describe("planner-service-google-tokens", () => {
  it("returns null when no Google token is stored", async () => {
    await expect(getGoogleConnection(createRepository(null) as never)).resolves.toBeNull();
  });

  it("decrypts rows flagged as encrypted without rewriting them", async () => {
    const repository = createRepository(await encryptedRow());

    const connection = await getGoogleConnection(repository as never);

    expect(connection).toEqual(expect.objectContaining({ accessToken: "plain-access", refreshToken: "plain-refresh" }));
    expect(repository.upsertIntegrationToken).not.toHaveBeenCalled();
  });

  it("migrates legacy plaintext rows to ciphertext on first read", async () => {
    const row = legacyRow();
    const repository = createRepository(row);

    const connection = await getGoogleConnection(repository as never);

    expect(connection?.accessToken).toBe("plain-access");
    expect(repository.upsertIntegrationToken).toHaveBeenCalledTimes(1);
    const [, stored] = repository.upsertIntegrationToken.mock.calls[0] as [string, StoredTokens];
    expect(stored.accessToken).not.toBe("plain-access");
    await expect(decryptSecret(stored.accessToken)).resolves.toBe("plain-access");
    await expect(decryptSecret(stored.refreshToken!)).resolves.toBe("plain-refresh");
    expect(stored.metadata).toEqual(expect.objectContaining({ email: "allowed@example.com", tokenEncryption: GOOGLE_TOKEN_ENCRYPTION }));
    expect(row.access_token).toBe(stored.accessToken);
    expect(row.metadata.tokenEncryption).toBe(GOOGLE_TOKEN_ENCRYPTION);
  });

  it("persists refreshed access tokens encrypted and keeps the refresh token", async () => {
    const repository = createRepository(await encryptedRow());
    const connection = await getGoogleConnection(repository as never);

    await connection?.onTokensRefreshed?.({ accessToken: "fresh-access", expiresAt: "2026-04-16T13:00:00.000Z" });

    const [, stored] = repository.upsertIntegrationToken.mock.calls[0] as [string, StoredTokens];
    await expect(decryptSecret(stored.accessToken)).resolves.toBe("fresh-access");
    await expect(decryptSecret(stored.refreshToken!)).resolves.toBe("plain-refresh");
    expect(stored.expiresAt).toBe("2026-04-16T13:00:00.000Z");
  });

  it("reads without persisting when no repository is supplied", async () => {
    const connection = await readGoogleConnection(legacyRow());

    expect(connection).toEqual(expect.objectContaining({ accessToken: "plain-access", email: "allowed@example.com" }));
    expect(connection?.onTokensRefreshed).toBeUndefined();
  });
});
