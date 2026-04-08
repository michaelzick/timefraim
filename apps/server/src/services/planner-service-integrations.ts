import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import type { GoogleConnection } from "../integration/google-calendar.js";
import type { TogglConnection } from "../integration/toggl-track.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";

export async function getGoogleConnection(repository: PlannerRepository): Promise<GoogleConnection | null> {
  const row = await repository.getIntegrationToken("google", pool);
  if (!row?.access_token) {
    return null;
  }

  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    calendarId: typeof row.metadata?.calendarId === "string" ? row.metadata.calendarId : env.GOOGLE_CALENDAR_ID,
    email: typeof row.metadata?.email === "string" ? row.metadata.email : env.ALLOWED_EMAIL,
  };
}

export async function getTogglConnection(repository: PlannerRepository): Promise<TogglConnection | null> {
  const row = await repository.getIntegrationToken("toggl", pool);
  if (!row?.access_token) {
    return null;
  }

  return {
    apiToken: row.access_token,
    workspaceId: typeof row.metadata?.workspaceId === "string" ? row.metadata.workspaceId : env.TOGGL_WORKSPACE_ID || "",
    defaultProjectId: typeof row.metadata?.defaultProjectId === "string" ? row.metadata.defaultProjectId : null,
  };
}

export async function saveGoogleSession(
  repository: PlannerRepository,
  input: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    email: string;
    calendarId: string;
  },
) {
  await repository.upsertIntegrationToken(
    "google",
    {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      metadata: { email: input.email, calendarId: input.calendarId },
    },
    pool,
  );
}

export async function saveTogglConnection(
  repository: PlannerRepository,
  input: { apiToken: string; workspaceId: string; defaultProjectId: string | null },
) {
  await repository.upsertIntegrationToken(
    "toggl",
    {
      accessToken: input.apiToken,
      refreshToken: null,
      expiresAt: null,
      metadata: { workspaceId: input.workspaceId, defaultProjectId: input.defaultProjectId },
    },
    pool,
  );
}
