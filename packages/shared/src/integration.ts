import { z } from "zod";

export const mcpProfileSchema = z.enum(["read-only", "full-access"]);

export const integrationStatusSchema = z.object({
  googleConnected: z.boolean(),
  googleEmail: z.string().email().nullable(),
  googleCalendarId: z.string(),
  togglConnected: z.boolean(),
  togglWorkspaceId: z.string().nullable(),
  mcpFullAccessConfigured: z.boolean(),
  mcpReadOnlyConfigured: z.boolean(),
  tunnelBaseUrl: z.string().nullable(),
});

export const togglConnectSchema = z.object({
  apiToken: z.string().min(1),
  workspaceId: z.string().min(1),
  defaultProjectId: z.string().optional().nullable(),
});

export const googleConnectSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  email: z.string().email(),
  calendarId: z.string().default("primary"),
});

export const authUserSchema = z.object({
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
export type GoogleConnect = z.infer<typeof googleConnectSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type McpProfile = z.infer<typeof mcpProfileSchema>;
