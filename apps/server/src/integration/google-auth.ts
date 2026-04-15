import { google } from "googleapis";
import { env } from "../config/env.js";
import type { GoogleConnection } from "./google-calendar.js";

type GoogleOAuthClient = InstanceType<typeof google.auth.OAuth2>;

export function getGoogleOAuthClient(connection: GoogleConnection): GoogleOAuthClient | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  const client = new google.auth.OAuth2({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken ?? undefined,
    expiry_date: connection.expiresAt ? new Date(connection.expiresAt).getTime() : undefined,
  });

  return client;
}
