import { integrationStatusSchema } from "@timefraim/shared";
import type { Queryable } from "../db/pool.js";
import { PlannerRepositoryCalendarStore } from "./planner-repository-calendar-store.js";
import type { EnvironmentStatus, IntegrationTokenRow } from "./planner-repository-types.js";

export class PlannerRepositoryIntegrationStore extends PlannerRepositoryCalendarStore {
  async upsertIntegrationToken(
    provider: string,
    input: {
      accessToken: string | null;
      refreshToken: string | null;
      expiresAt: string | null;
      metadata: Record<string, unknown>;
    },
    db: Queryable,
  ) {
    await db.query(
      `insert into public.integration_tokens (provider, access_token, refresh_token, expires_at, metadata)
       values ($1, $2, $3, $4, $5)
       on conflict (provider)
       do update
         set access_token = excluded.access_token,
             refresh_token = excluded.refresh_token,
             expires_at = excluded.expires_at,
             metadata = excluded.metadata`,
      [provider, input.accessToken, input.refreshToken, input.expiresAt, input.metadata],
    );
  }

  async getIntegrationToken(provider: string, db: Queryable) {
    const result = await db.query(`select * from public.integration_tokens where provider = $1 limit 1`, [
      provider,
    ]);
    return (result.rows[0] as IntegrationTokenRow | undefined) ?? null;
  }

  async listIntegrationTokens(db: Queryable) {
    const result = await db.query(`select * from public.integration_tokens`);
    return result.rows as IntegrationTokenRow[];
  }

  getIntegrationStatus(rows: IntegrationTokenRow[], envStatus: EnvironmentStatus) {
    const google = rows.find((row) => row.provider === "google");
    const toggl = rows.find((row) => row.provider === "toggl");
    return integrationStatusSchema.parse({
      googleConnected: Boolean(google?.access_token),
      googleEmail: typeof google?.metadata?.email === "string" ? google.metadata.email : null,
      googleCalendarId:
        typeof google?.metadata?.calendarId === "string" ? google.metadata.calendarId : "primary",
      togglConnected: Boolean(toggl?.access_token),
      togglWorkspaceId:
        typeof toggl?.metadata?.workspaceId === "string" ? toggl.metadata.workspaceId : null,
      mcpFullAccessConfigured: envStatus.mcpFullAccessConfigured,
      mcpReadOnlyConfigured: envStatus.mcpReadOnlyConfigured,
      tunnelBaseUrl: envStatus.tunnelBaseUrl,
    });
  }
}
