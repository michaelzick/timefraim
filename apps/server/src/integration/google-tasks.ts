import { google } from "googleapis";
import type { GoogleConnection } from "./google-calendar.js";
import { getGoogleOAuthClient } from "./google-auth.js";

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

  const auth = getGoogleOAuthClient(params.connection);
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
