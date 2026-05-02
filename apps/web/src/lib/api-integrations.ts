import {
  authSessionSchema,
  googleCalendarSettingsSchema,
  googleConnectSchema,
  integrationStatusSchema,
  togglConnectSchema,
  togglDiscoverInputSchema,
  togglDiscoverResultSchema,
  togglIntegrationSettingsSchema,
  type AuthSession,
  type GoogleCalendarSettings,
  type GoogleCalendarSettingsUpdate,
  type GoogleConnect,
  type IntegrationStatus,
  type TogglConnect,
  type TogglDiscoverInput,
  type TogglDiscoverResult,
  type TogglIntegrationSettings,
} from "@timefraim/shared";
import { request } from "@/lib/api-client";

export const integrationApi = {
  getAuthSession: (token: string, signal?: AbortSignal) =>
    request<AuthSession>("/api/auth/me", token, { schema: authSessionSchema, signal }),
  saveGoogleSession: (token: string, body: GoogleConnect) =>
    request<IntegrationStatus, GoogleConnect>("/api/integrations/google/session", token, {
      method: "POST",
      body: googleConnectSchema.parse(body),
      schema: integrationStatusSchema,
    }),
  getTogglSettings: (token: string, signal?: AbortSignal) =>
    request<TogglIntegrationSettings>("/api/integrations/toggl", token, {
      schema: togglIntegrationSettingsSchema,
      signal,
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
  getIntegrationStatus: (token: string, signal?: AbortSignal) =>
    request<IntegrationStatus>("/api/integrations/status", token, {
      schema: integrationStatusSchema,
      signal,
    }),
  getGoogleCalendarSettings: (token: string, signal?: AbortSignal) =>
    request<GoogleCalendarSettings>("/api/integrations/google/calendars", token, {
      schema: googleCalendarSettingsSchema,
      signal,
    }),
  saveGoogleCalendarSettings: (token: string, body: GoogleCalendarSettingsUpdate) =>
    request<GoogleCalendarSettings, GoogleCalendarSettingsUpdate>(
      "/api/integrations/google/calendars",
      token,
      { method: "PUT", body, schema: googleCalendarSettingsSchema },
    ),
};
