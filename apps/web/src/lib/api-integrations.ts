import {
  authSessionSchema,
  googleCalendarSettingsSchema,
  googleConnectSchema,
  integrationStatusSchema,
  openAiConnectSchema,
  openAiGeneratedImageSchema,
  openAiImageGenerateSchema,
  openAiImageSettingsSchema,
  togglConnectSchema,
  togglDiscoverInputSchema,
  togglDiscoverResultSchema,
  togglIntegrationSettingsSchema,
  type AuthSession,
  type GoogleCalendarSettings,
  type GoogleCalendarSettingsUpdate,
  type GoogleConnect,
  type IntegrationStatus,
  type OpenAiConnect,
  type OpenAiGeneratedImage,
  type OpenAiImageGenerate,
  type OpenAiImageSettings,
  type TogglConnect,
  type TogglDiscoverInput,
  type TogglDiscoverResult,
  type TogglIntegrationSettings,
} from "@timefraim/shared";
import { request } from "@/lib/api-client";

export const integrationApi = {
  getAuthSession: (token: string) =>
    request<AuthSession>("/api/auth/me", token, { schema: authSessionSchema }),
  saveGoogleSession: (token: string, body: GoogleConnect) =>
    request<IntegrationStatus, GoogleConnect>("/api/integrations/google/session", token, {
      method: "POST",
      body: googleConnectSchema.parse(body),
      schema: integrationStatusSchema,
    }),
  getTogglSettings: (token: string) =>
    request<TogglIntegrationSettings>("/api/integrations/toggl", token, {
      schema: togglIntegrationSettingsSchema,
    }),
  discoverTogglConnection: (token: string, body: TogglDiscoverInput) =>
    request<TogglDiscoverResult, TogglDiscoverInput>("/api/integrations/toggl/discover", token, {
      method: "POST",
      body: togglDiscoverInputSchema.parse(body),
      schema: togglDiscoverResultSchema,
    }),
  saveTogglConnection: (token: string, body: TogglConnect) =>
    request<TogglIntegrationSettings, TogglConnect>("/api/integrations/toggl/connect", token, {
      method: "POST",
      body: togglConnectSchema.parse(body),
      schema: togglIntegrationSettingsSchema,
    }),
  deleteTogglConnection: (token: string) =>
    request<TogglIntegrationSettings>("/api/integrations/toggl/connect", token, {
      method: "DELETE",
      schema: togglIntegrationSettingsSchema,
    }),
  getIntegrationStatus: (token: string) =>
    request<IntegrationStatus>("/api/integrations/status", token, {
      schema: integrationStatusSchema,
    }),
  getGoogleCalendarSettings: (token: string) =>
    request<GoogleCalendarSettings>("/api/integrations/google/calendars", token, {
      schema: googleCalendarSettingsSchema,
    }),
  saveGoogleCalendarSettings: (token: string, body: GoogleCalendarSettingsUpdate) =>
    request<GoogleCalendarSettings, GoogleCalendarSettingsUpdate>(
      "/api/integrations/google/calendars",
      token,
      { method: "PUT", body, schema: googleCalendarSettingsSchema },
    ),
  getOpenAiImageSettings: (token: string) =>
    request<OpenAiImageSettings>("/api/integrations/openai", token, {
      schema: openAiImageSettingsSchema,
    }),
  saveOpenAiConnection: (token: string, body: OpenAiConnect) =>
    request<OpenAiImageSettings, OpenAiConnect>("/api/integrations/openai/connect", token, {
      method: "POST",
      body: openAiConnectSchema.parse(body),
      schema: openAiImageSettingsSchema,
    }),
  deleteOpenAiConnection: (token: string) =>
    request<OpenAiImageSettings>("/api/integrations/openai/connect", token, {
      method: "DELETE",
      schema: openAiImageSettingsSchema,
    }),
  generateOpenAiImage: (token: string, body: OpenAiImageGenerate) =>
    request<OpenAiGeneratedImage, OpenAiImageGenerate>("/api/integrations/openai/images", token, {
      method: "POST",
      body: openAiImageGenerateSchema.parse(body),
      schema: openAiGeneratedImageSchema,
    }),
};
