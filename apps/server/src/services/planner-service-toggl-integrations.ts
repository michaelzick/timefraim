import type {
  TogglDiscoverResult,
  TogglIntegrationSettings,
} from "@timefraim/shared";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { decryptSecret, encryptSecret, maskSecret } from "../integration/integration-crypto.js";
import {
  discoverTogglData,
  validateTogglConnection,
  type TogglConnection,
} from "../integration/toggl-track.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";

export async function getTogglConnection(
  repository: PlannerRepository,
  userId: string | null | undefined,
): Promise<TogglConnection | null> {
  if (!userId) {
    return null;
  }

  const row = await repository.getUserTogglConnection(userId, pool);
  if (!row) {
    return null;
  }

  return {
    apiToken: decryptSecret(row.apiTokenCiphertext),
    apiTokenHint: row.apiTokenHint,
    workspaceId: row.workspaceId,
    workspaceName: row.workspaceName,
    defaultProjectId: row.defaultProjectId,
    defaultProjectName: row.defaultProjectName,
    availableWorkspaces: row.availableWorkspaces,
    availableProjects: row.availableProjects,
    lastValidatedAt: row.lastValidatedAt,
  };
}

export async function getTogglSettings(
  repository: PlannerRepository,
  userId: string,
): Promise<TogglIntegrationSettings> {
  const row = await repository.getUserTogglConnection(userId, pool);
  return repository.getTogglSettings(row);
}

export async function discoverTogglConnection(input: {
  apiToken: string;
  workspaceId?: string | null;
}): Promise<TogglDiscoverResult> {
  const apiToken = input.apiToken.trim();
  return discoverTogglData({
    apiToken,
    apiTokenHint: maskSecret(apiToken),
    workspaceId: input.workspaceId ?? null,
  });
}

export async function saveTogglConnection(
  repository: PlannerRepository,
  userId: string,
  input: {
    apiToken?: string | null;
    workspaceId: string;
    defaultProjectId: string | null;
  },
): Promise<TogglIntegrationSettings> {
  const existing = await repository.getUserTogglConnection(userId, pool);
  const providedApiToken = input.apiToken?.trim() || null;
  const apiToken = providedApiToken
    ? providedApiToken
    : existing
      ? decryptSecret(existing.apiTokenCiphertext)
      : null;

  if (!apiToken) {
    throw new Error(
      "A Toggl API token is required before this connection can be saved",
    );
  }

  const validated = await validateTogglConnection({
    apiToken,
    apiTokenHint: providedApiToken
      ? maskSecret(apiToken)
      : existing?.apiTokenHint ?? maskSecret(apiToken),
    workspaceId: input.workspaceId,
    defaultProjectId: input.defaultProjectId,
  });

  const saved = await repository.upsertUserTogglConnection(
    userId,
    {
      apiTokenCiphertext: providedApiToken
        ? encryptSecret(apiToken)
        : existing!.apiTokenCiphertext,
      apiTokenHint: validated.apiTokenHint,
      workspaceId: validated.workspaceId,
      workspaceName: validated.workspaceName,
      defaultProjectId: validated.defaultProjectId,
      defaultProjectName: validated.defaultProjectName,
      availableWorkspaces: validated.availableWorkspaces,
      availableProjects: validated.availableProjects,
      lastValidatedAt: validated.lastValidatedAt,
    },
    pool,
  );

  return repository.getTogglSettings(saved);
}

export async function deleteTogglConnection(
  repository: PlannerRepository,
  userId: string,
) {
  await repository.deleteUserTogglConnection(userId, pool);
}

export async function getAllowedPlannerUserId(
  repository: PlannerRepository,
): Promise<string> {
  const userId = await repository.findAuthUserIdByEmail(env.ALLOWED_EMAIL, pool);
  if (!userId) {
    throw new Error(
      `Could not resolve the allowed planner user for ${env.ALLOWED_EMAIL}`,
    );
  }

  return userId;
}
