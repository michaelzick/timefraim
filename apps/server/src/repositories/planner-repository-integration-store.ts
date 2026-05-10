import type { IntegrationStatus, TogglIntegrationSettings } from "@timefraim/shared";
import { integrationStatusSchema, togglIntegrationSettingsSchema } from "@timefraim/shared";
import type { Queryable } from "../db/pool.js";
import { mapUserTogglConnection } from "./planner-repository-mappers.js";
import { PlannerRepositoryCalendarSyncStore } from "./planner-repository-calendar-sync-store.js";
import type {
  EnvironmentStatus,
  IntegrationTokenRow,
  UserTogglConnectionRecord,
} from "./planner-repository-types.js";

export class PlannerRepositoryIntegrationStore extends PlannerRepositoryCalendarSyncStore {
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

  async listIntegrationTokens(db: Queryable): Promise<IntegrationTokenRow[]> {
    const result = await db.query(`select * from public.integration_tokens`);
    return result.rows as IntegrationTokenRow[];
  }

  async deleteIntegrationToken(provider: string, db: Queryable) {
    await db.query(`delete from public.integration_tokens where provider = $1`, [provider]);
  }

  async getUserTogglConnection(userId: string, db: Queryable): Promise<UserTogglConnectionRecord | null> {
    const result = await db.query(`select * from public.user_toggl_connections where user_id = $1 limit 1`, [userId]);
    return result.rows[0] ? mapUserTogglConnection(result.rows[0]) : null;
  }

  async upsertUserTogglConnection(
    userId: string,
    input: Omit<UserTogglConnectionRecord, "userId" | "createdAt" | "updatedAt">,
    db: Queryable,
  ): Promise<UserTogglConnectionRecord> {
    const result = await db.query(
      `insert into public.user_toggl_connections (
         user_id,
         api_token_ciphertext,
         api_token_hint,
         workspace_id,
         workspace_name,
         default_project_id,
         default_project_name,
         available_workspaces,
         available_projects,
         last_validated_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
       on conflict (user_id)
       do update
         set api_token_ciphertext = excluded.api_token_ciphertext,
             api_token_hint = excluded.api_token_hint,
             workspace_id = excluded.workspace_id,
             workspace_name = excluded.workspace_name,
             default_project_id = excluded.default_project_id,
             default_project_name = excluded.default_project_name,
             available_workspaces = excluded.available_workspaces,
             available_projects = excluded.available_projects,
             last_validated_at = excluded.last_validated_at
       returning *`,
      [
        userId,
        input.apiTokenCiphertext,
        input.apiTokenHint,
        input.workspaceId,
        input.workspaceName,
        input.defaultProjectId,
        input.defaultProjectName,
        JSON.stringify(input.availableWorkspaces ?? []),
        JSON.stringify(input.availableProjects ?? []),
        input.lastValidatedAt,
      ],
    );
    return mapUserTogglConnection(result.rows[0]);
  }

  async deleteUserTogglConnection(userId: string, db: Queryable) {
    await db.query(`delete from public.user_toggl_connections where user_id = $1`, [userId]);
  }

  async findAuthUserIdByEmail(email: string, db: Queryable): Promise<string | null> {
    const result = await db.query(
      `select id
       from auth.users
       where lower(email::text) = lower($1)
       limit 1`,
      [email],
    );
    const row = result.rows[0] as { id?: unknown } | undefined;
    return typeof row?.id === "string" ? row.id : null;
  }

  getIntegrationStatus(
    rows: IntegrationTokenRow[],
    togglConnection: UserTogglConnectionRecord | null,
    envStatus: EnvironmentStatus,
  ): IntegrationStatus {
    const google = rows.find((row) => row.provider === "google");
    return integrationStatusSchema.parse({
      googleConnected: Boolean(google?.access_token),
      googleEmail: typeof google?.metadata?.email === "string" ? google.metadata.email : null,
      googleCalendarId:
        typeof google?.metadata?.calendarId === "string" ? google.metadata.calendarId : "primary",
      togglConnected: Boolean(togglConnection),
      togglWorkspaceId: togglConnection?.workspaceId ?? null,
      togglWorkspaceName: togglConnection?.workspaceName ?? null,
      togglDefaultProjectId: togglConnection?.defaultProjectId ?? null,
      togglDefaultProjectName: togglConnection?.defaultProjectName ?? null,
      togglHasSavedToken: Boolean(togglConnection?.apiTokenCiphertext),
      togglApiTokenHint: togglConnection?.apiTokenHint ?? null,
      mcpFullAccessConfigured: envStatus.mcpFullAccessConfigured,
      mcpReadOnlyConfigured: envStatus.mcpReadOnlyConfigured,
      tunnelBaseUrl: envStatus.tunnelBaseUrl,
    });
  }

  getTogglSettings(togglConnection: UserTogglConnectionRecord | null): TogglIntegrationSettings {
    return togglIntegrationSettingsSchema.parse({
      connected: Boolean(togglConnection),
      hasSavedToken: Boolean(togglConnection?.apiTokenCiphertext),
      apiTokenHint: togglConnection?.apiTokenHint ?? null,
      workspaceId: togglConnection?.workspaceId ?? null,
      workspaceName: togglConnection?.workspaceName ?? null,
      defaultProjectId: togglConnection?.defaultProjectId ?? null,
      defaultProjectName: togglConnection?.defaultProjectName ?? null,
      availableWorkspaces: togglConnection?.availableWorkspaces ?? [],
      availableProjects: togglConnection?.availableProjects ?? [],
      lastValidatedAt: togglConnection?.lastValidatedAt ?? null,
    });
  }
}
