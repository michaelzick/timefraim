import { z } from "zod";

export const mcpProfileSchema = z.enum(["read-only", "full-access"]);

export const togglWorkspaceOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const togglProjectOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  workspaceId: z.string(),
  active: z.boolean().default(true),
});

export const integrationStatusSchema = z.object({
  googleConnected: z.boolean(),
  googleEmail: z.string().email().nullable(),
  googleCalendarId: z.string(),
  togglConnected: z.boolean(),
  togglWorkspaceId: z.string().nullable(),
  togglWorkspaceName: z.string().nullable(),
  togglDefaultProjectId: z.string().nullable(),
  togglDefaultProjectName: z.string().nullable(),
  togglHasSavedToken: z.boolean(),
  togglApiTokenHint: z.string().nullable(),
  mcpFullAccessConfigured: z.boolean(),
  mcpReadOnlyConfigured: z.boolean(),
  tunnelBaseUrl: z.string().nullable(),
});

export const togglConnectSchema = z.object({
  apiToken: z.string().trim().min(1).optional().nullable(),
  workspaceId: z.string().min(1),
  defaultProjectId: z.string().optional().nullable(),
});

export const togglDiscoverInputSchema = z.object({
  apiToken: z.string().trim().min(1),
  workspaceId: z.string().optional().nullable(),
});

export const togglDiscoverResultSchema = z.object({
  apiTokenHint: z.string(),
  selectedWorkspaceId: z.string().nullable(),
  selectedWorkspaceName: z.string().nullable(),
  defaultProjectId: z.string().nullable(),
  defaultProjectName: z.string().nullable(),
  availableWorkspaces: z.array(togglWorkspaceOptionSchema),
  availableProjects: z.array(togglProjectOptionSchema),
});

export const togglIntegrationSettingsSchema = z.object({
  connected: z.boolean(),
  hasSavedToken: z.boolean(),
  apiTokenHint: z.string().nullable(),
  workspaceId: z.string().nullable(),
  workspaceName: z.string().nullable(),
  defaultProjectId: z.string().nullable(),
  defaultProjectName: z.string().nullable(),
  availableWorkspaces: z.array(togglWorkspaceOptionSchema),
  availableProjects: z.array(togglProjectOptionSchema),
  lastValidatedAt: z.string().datetime().nullable(),
});

export const googleConnectSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  email: z.string().email(),
  calendarId: z.string().default("primary"),
});

export const googleCalendarOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  primary: z.boolean().default(false),
  backgroundColor: z.string().nullable().default(null),
});

export const googleCalendarSettingsSchema = z.object({
  availableCalendars: z.array(googleCalendarOptionSchema),
  syncCalendarIds: z.array(z.string()),
  syncPlannerBlocksToCalendar: z.boolean().default(true),
  plannerCalendarId: z.string(),
});

export const googleCalendarSettingsUpdateSchema = z.object({
  syncCalendarIds: z.array(z.string()).min(1),
  syncPlannerBlocksToCalendar: z.boolean().default(true),
});

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});

export const authSessionSchema = z.object({
  user: authUserSchema,
  integrationStatus: integrationStatusSchema,
});

export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;
export type TogglConnect = z.infer<typeof togglConnectSchema>;
export type TogglDiscoverInput = z.infer<typeof togglDiscoverInputSchema>;
export type TogglDiscoverResult = z.infer<typeof togglDiscoverResultSchema>;
export type TogglIntegrationSettings = z.infer<typeof togglIntegrationSettingsSchema>;
export type TogglWorkspaceOption = z.infer<typeof togglWorkspaceOptionSchema>;
export type TogglProjectOption = z.infer<typeof togglProjectOptionSchema>;
export type GoogleConnect = z.infer<typeof googleConnectSchema>;
export type GoogleCalendarOption = z.infer<typeof googleCalendarOptionSchema>;
export type GoogleCalendarSettings = z.infer<typeof googleCalendarSettingsSchema>;
export type GoogleCalendarSettingsUpdate = z.infer<typeof googleCalendarSettingsUpdateSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type McpProfile = z.infer<typeof mcpProfileSchema>;
