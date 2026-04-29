import { openAiImageSettingsSchema, type OpenAiGeneratedImage, type OpenAiImageSettings } from "@timefraim/shared";
import { pool } from "../db/pool.js";
import { decryptSecret, encryptSecret, maskSecret } from "../integration/integration-crypto.js";
import { generateOpenAiImage as requestOpenAiImage } from "../integration/openai-images.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import type { IntegrationTokenRow } from "../repositories/planner-repository-types.js";
import { dependencyUnavailable, invalidInput } from "./planner-errors.js";

const OPENAI_PROVIDER = "openai";
const OPENAI_IMAGE_MODEL = "gpt-image-2";

function getOpenAiApiKeyHint(row: IntegrationTokenRow | null) {
  return typeof row?.metadata?.apiKeyHint === "string" ? row.metadata.apiKeyHint : null;
}

function buildOpenAiImageSettings(row: IntegrationTokenRow | null): OpenAiImageSettings {
  return openAiImageSettingsSchema.parse({
    connected: Boolean(row?.access_token),
    apiKeyHint: getOpenAiApiKeyHint(row),
    model: OPENAI_IMAGE_MODEL,
  });
}

function readOpenAiApiKey(row: IntegrationTokenRow | null) {
  return row?.access_token ? decryptSecret(row.access_token) : null;
}

export async function getOpenAiImageSettings(repository: PlannerRepository): Promise<OpenAiImageSettings> {
  const row = await repository.getIntegrationToken(OPENAI_PROVIDER, pool);
  return buildOpenAiImageSettings(row);
}

export async function saveOpenAiConnection(repository: PlannerRepository, apiKey: string) {
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    throw invalidInput("An OpenAI API key is required before GPT Image 2 can be used");
  }

  await repository.upsertIntegrationToken(
    OPENAI_PROVIDER,
    {
      accessToken: encryptSecret(trimmedApiKey),
      refreshToken: null,
      expiresAt: null,
      metadata: {
        apiKeyHint: maskSecret(trimmedApiKey),
        model: OPENAI_IMAGE_MODEL,
      },
    },
    pool,
  );

  return getOpenAiImageSettings(repository);
}

export async function deleteOpenAiConnection(repository: PlannerRepository) {
  await repository.deleteIntegrationToken(OPENAI_PROVIDER, pool);
  return getOpenAiImageSettings(repository);
}

export async function generateSavedOpenAiImage(
  repository: PlannerRepository,
  prompt: string,
): Promise<OpenAiGeneratedImage> {
  const row = await repository.getIntegrationToken(OPENAI_PROVIDER, pool);
  const apiKey = readOpenAiApiKey(row);

  if (!apiKey) {
    throw dependencyUnavailable("OpenAI Images is not connected");
  }

  try {
    return await requestOpenAiImage({ apiKey, prompt });
  } catch (error) {
    throw dependencyUnavailable(
      error instanceof Error ? error.message : "OpenAI Images request failed",
    );
  }
}
