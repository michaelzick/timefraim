import type { CalendarEventView, ScheduleBlock, Task } from "@schejewel/shared";
import { google } from "googleapis";
import { env } from "../config/env.js";
import { buildGoogleEventPayload } from "../services/planner-domain.js";

export type GoogleConnection = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  calendarId: string;
  email: string;
};

type GoogleEventRecord = {
  externalEventId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAppManaged: boolean;
  rawPayload: Record<string, unknown>;
  scheduleBlockId: string | null;
};

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

export async function syncGoogleCalendarWindow(
  connection: GoogleConnection | null,
  range: { timeMin: string; timeMax: string },
): Promise<GoogleEventRecord[]> {
  if (!connection) {
    return [];
  }

  const auth = getOAuthClient(connection);
  if (!auth) {
    return [];
  }

  const calendar = google.calendar({ version: "v3", auth });
  const response = await calendar.events.list({
    calendarId: connection.calendarId,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: range.timeMin,
    timeMax: range.timeMax,
  });

  return (response.data.items ?? [])
    .filter((event) => event.id && event.start?.dateTime && event.end?.dateTime)
    .map((event) => ({
      externalEventId: event.id!,
      title: event.summary ?? "Busy",
      startAt: event.start!.dateTime!,
      endAt: event.end!.dateTime!,
      isAppManaged: event.extendedProperties?.private?.origin === "schejewel",
      rawPayload: event as unknown as Record<string, unknown>,
      scheduleBlockId: event.extendedProperties?.private?.scheduleBlockId ?? null,
    }));
}

export async function upsertGoogleScheduleBlock(params: {
  connection: GoogleConnection | null;
  task: Task;
  block: ScheduleBlock;
}): Promise<string | null> {
  if (!params.connection) {
    return null;
  }

  const auth = getOAuthClient(params.connection);
  if (!auth) {
    return null;
  }

  const calendar = google.calendar({ version: "v3", auth });
  const payload = buildGoogleEventPayload(params.task, params.block);

  if (params.block.googleEventId) {
    await calendar.events.update({
      calendarId: params.connection.calendarId,
      eventId: params.block.googleEventId,
      requestBody: payload,
    });
    return params.block.googleEventId;
  }

  const response = await calendar.events.insert({
    calendarId: params.connection.calendarId,
    requestBody: payload,
  });

  return response.data.id ?? null;
}

export async function deleteGoogleScheduleBlock(
  connection: GoogleConnection | null,
  googleEventId: string | null | undefined,
): Promise<void> {
  if (!connection || !googleEventId) {
    return;
  }

  const auth = getOAuthClient(connection);
  if (!auth) {
    return;
  }

  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({
    calendarId: connection.calendarId,
    eventId: googleEventId,
  });
}

export function toCalendarEventView(record: GoogleEventRecord): CalendarEventView {
  return {
    id: record.externalEventId,
    title: record.title,
    startAt: record.startAt,
    endAt: record.endAt,
    isAppManaged: record.isAppManaged,
  };
}
