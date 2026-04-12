import { google } from "googleapis";
import { env } from "../config/env.js";
import type { GoogleConnection } from "./google-calendar.js";

function getOAuthClient(connection: GoogleConnection) {
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

function toGoogleTaskDue(plannerDate: string | null | undefined) {
  return plannerDate ? `${plannerDate}T00:00:00.000Z` : undefined;
}

export async function createGoogleTask(params: {
  connection: GoogleConnection | null;
  title: string;
  notes: string | null;
  plannerDate?: string | null;
}) {
  if (!params.connection) {
    return null;
  }

  const auth = getOAuthClient(params.connection);
  if (!auth) {
    return null;
  }

  const tasks = google.tasks({ version: "v1", auth });
  const response = await tasks.tasks.insert({
    tasklist: "@default",
    requestBody: {
      title: params.title,
      notes: params.notes ?? undefined,
      status: "needsAction",
      due: toGoogleTaskDue(params.plannerDate),
    },
  });

  return response.data.id ?? null;
}
