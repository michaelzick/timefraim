import { googlePlannerSyncTargetSchema, type GooglePlannerSyncTarget } from "@timefraim/shared";
import { env } from "../config/env.ts";
import { pool } from "../db/pool.ts";
import type { GoogleConnection } from "../integration/google-api-client.ts";
import { decryptSecret, encryptSecret } from "../integration/integration-crypto.ts";
import type { PlannerRepository } from "../repositories/planner-repository.ts";
import type { IntegrationTokenRow } from "../repositories/planner-repository-types.ts";

// Rows written before this marker stored Google tokens in plaintext. The flag
// lets reads tell the two apart while legacy rows migrate lazily on first use.
export const GOOGLE_TOKEN_ENCRYPTION = "aes-gcm-v1";

type IntegrationRowWithMetadata = Pick<IntegrationTokenRow, "metadata"> | null | undefined;

export type GoogleTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

export function readGoogleMetadata(row: IntegrationRowWithMetadata) {
  return row?.metadata ?? {};
}

export function readStringMetadata(row: IntegrationRowWithMetadata, key: string, fallback: string) {
  const value = readGoogleMetadata(row)[key];
  return typeof value === "string" ? value : fallback;
}

function readBooleanMetadata(row: IntegrationRowWithMetadata, key: string, fallback: boolean) {
  const value = readGoogleMetadata(row)[key];
  return typeof value === "boolean" ? value : fallback;
}

export function readGoogleSyncCalendarIds(row: IntegrationRowWithMetadata): string[] | undefined {
  const ids = readGoogleMetadata(row).syncCalendarIds;
  if (!Array.isArray(ids)) {
    return undefined;
  }

  const normalizedIds = ids.filter((id): id is string => typeof id === "string");
  return normalizedIds.length > 0 ? [...new Set(normalizedIds)] : undefined;
}

export function readGooglePlannerSyncTarget(row: IntegrationRowWithMetadata): GooglePlannerSyncTarget {
  const value = readGoogleMetadata(row).plannerSyncTarget;
  const parsed = googlePlannerSyncTargetSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  return readBooleanMetadata(row, "syncPlannerBlocksToCalendar", true)
    ? "calendar_event"
    : "none";
}

export function readGoogleSyncPlannerBlocksToCalendar(row: IntegrationRowWithMetadata) {
  return readGooglePlannerSyncTarget(row) === "calendar_event";
}

function isEncryptedRow(row: IntegrationRowWithMetadata) {
  return readGoogleMetadata(row).tokenEncryption === GOOGLE_TOKEN_ENCRYPTION;
}

// Persists tokens (encrypted whenever INTEGRATION_ENCRYPTION_KEY is configured)
// and mirrors the stored values onto `row`, so later writes within the same
// request never resurrect plaintext or drop the encryption marker.
export async function writeGoogleTokens(
  repository: PlannerRepository,
  row: IntegrationTokenRow | null,
  tokens: GoogleTokenSet,
  metadata: Record<string, unknown>,
) {
  const encrypt = Boolean(env.INTEGRATION_ENCRYPTION_KEY);
  const nextMetadata: Record<string, unknown> = { ...metadata };
  delete nextMetadata.tokenEncryption;
  if (encrypt) {
    nextMetadata.tokenEncryption = GOOGLE_TOKEN_ENCRYPTION;
  }

  const stored = {
    accessToken: encrypt ? await encryptSecret(tokens.accessToken) : tokens.accessToken,
    refreshToken: tokens.refreshToken && encrypt ? await encryptSecret(tokens.refreshToken) : tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    metadata: nextMetadata,
  };
  await repository.upsertIntegrationToken("google", stored, pool);

  if (row) {
    row.access_token = stored.accessToken;
    row.refresh_token = stored.refreshToken;
    row.expires_at = stored.expiresAt;
    row.metadata = nextMetadata;
  }
}

async function readStoredTokens(row: IntegrationTokenRow, accessToken: string): Promise<GoogleTokenSet> {
  const encrypted = isEncryptedRow(row);
  return {
    accessToken: encrypted ? await decryptSecret(accessToken) : accessToken,
    refreshToken: row.refresh_token && encrypted ? await decryptSecret(row.refresh_token) : row.refresh_token,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  };
}

// Passing a repository opts into persistence: legacy plaintext rows are
// re-saved encrypted, and refreshed access tokens are written back. Settings
// flows read without one because they rewrite the row themselves.
export async function readGoogleConnection(
  row: IntegrationTokenRow | null,
  repository?: PlannerRepository,
): Promise<GoogleConnection | null> {
  if (!row?.access_token) {
    return null;
  }

  const tokens = await readStoredTokens(row, row.access_token);
  if (repository && !isEncryptedRow(row) && env.INTEGRATION_ENCRYPTION_KEY) {
    await writeGoogleTokens(repository, row, tokens, readGoogleMetadata(row));
  }

  return {
    ...tokens,
    calendarId: readStringMetadata(row, "calendarId", env.GOOGLE_CALENDAR_ID),
    plannerCalendarId: readStringMetadata(row, "plannerCalendarId", env.GOOGLE_PLANNER_CALENDAR_ID),
    email: readStringMetadata(row, "email", env.ALLOWED_EMAIL),
    ...(repository
      ? {
          onTokensRefreshed: ({ accessToken, expiresAt }: { accessToken: string; expiresAt: string }) =>
            writeGoogleTokens(
              repository,
              row,
              { accessToken, refreshToken: tokens.refreshToken, expiresAt },
              readGoogleMetadata(row),
            ),
        }
      : {}),
  };
}

export async function getGoogleConnection(repository: PlannerRepository): Promise<GoogleConnection | null> {
  const row = await repository.getIntegrationToken("google", pool);
  return readGoogleConnection(row, repository);
}

export async function getGoogleCalendarSyncState(repository: PlannerRepository) {
  const row = await repository.getIntegrationToken("google", pool);
  const connection = await readGoogleConnection(row, repository);
  return {
    connection,
    plannerSyncTarget: connection ? readGooglePlannerSyncTarget(row) : "none",
    syncPlannerBlocksToCalendar:
      Boolean(connection) && readGoogleSyncPlannerBlocksToCalendar(row),
  };
}
